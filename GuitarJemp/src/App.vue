<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LayoutManager from '@/components/app/LayoutManager.vue'
import Fretboard from '@/features/fretboard'
import Timeline from '@/features/timeline'
import { TransportBar } from '@/features/transport'
import FretboardContextMenu from '@/features/fretboard/components/FretboardContextMenu.vue'
import { AuthDialog, ConnectionsDialog, LibraryPanel } from '@/features/cloud'
import { useInstrumentStore } from '@/store/useInstrument'
import { useAuthStore } from '@/store/useAuth'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useLibraryStore } from '@/store/useLibrary'
import { buildSongSnapshot } from '@/domain/song/songSnapshot'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { initAudioEngine, installAudioAutoWarmup } from '@/domain/audio/simpleSynth'
import { useTheme } from 'vuetify'

const numFrets = ref(12)
const corePadResizePx = ref(0)
const fretboardMainEl = ref(null)
const timelineRef = ref(null)
const transportVisible = ref(true)
const showFretboard = ref(true)
const showTimeline = ref(true)
const showTransportBar = ref(true)
const showLibraryInPaneB = ref(false)
const viewMode = ref('desktop')
const phonePane = ref('fretboard')
const isPortraitViewport = ref(false)
const authOpen = ref(false)
const connectionsOpen = ref(false)
const saveAsNewOpen = ref(false)
const saveAsNewTitle = ref('')
const saveAsNewVisibility = ref('private')
const saveAsNewBusy = ref(false)
const preferencesOpen = ref(false)
const songName = ref('')
const RESIZE_MIN = -100
const RESIZE_MAX = 260
let fretboardResizeObserver = null
let fretboardBaseContentHeightPx = 0
const THEME_STORAGE_KEY = 'guitarjemp.ui.theme'

const instrument = useInstrumentStore()
const auth = useAuthStore()
const notes = useNotesStore()
const selection = useSelectionStore()
const handPositions = useHandPositionsStore()
const transport = useTransportStore()
const timelineSettings = useTimelineSettingsStore()
const library = useLibraryStore()
const theme = useTheme()

const hasNotes = computed(() => (notes.activeNotes?.length ?? 0) > 0)
const canSaveAsNew = computed(() => hasNotes.value)
const isDarkTheme = computed(() => Boolean(theme.global.current.value.dark))
const preferenceToneDuration = computed({
  get: () => Number(timelineSettings.soundDurationScale) || 1,
  set: (v) => timelineSettings.setSoundDurationScale(Number(v)),
})
const preferenceSoundPreview = computed({
  get: () => Boolean(timelineSettings.soundPreviewEnabled),
  set: (v) => timelineSettings.setSoundPreviewEnabled(Boolean(v)),
})
const preferenceDarkMode = computed({
  get: () => isDarkTheme.value,
  set: (v) => applyTheme(Boolean(v) ? 'guitarjempDark' : 'guitarjemp'),
})
const isPhoneView = computed(() => viewMode.value === 'phone')
const showPhoneRotateOverlay = computed(() => isPhoneView.value && isPortraitViewport.value)

function applyTheme(name) {
  const next = name === 'guitarjempDark' ? 'guitarjempDark' : 'guitarjemp'
  theme.global.name.value = next
  localStorage.setItem(THEME_STORAGE_KEY, next)
}

function updateViewportOrientationFlag() {
  if (typeof window === 'undefined') return
  isPortraitViewport.value = window.innerHeight > window.innerWidth
}

function updateFretboardResizeFromParentHeight(heightPx) {
  if (isPhoneView.value) {
    corePadResizePx.value = 0
    return
  }
  const h = Number(heightPx) || 0
  if (!(h > 0)) return
  const parentEl = fretboardMainEl.value
  const contentEl = parentEl?.querySelector?.('.fretboard-body')
  if (!(fretboardBaseContentHeightPx > 0)) {
    const intrinsic = Number(contentEl?.scrollHeight) || 0
    if (intrinsic > 0) fretboardBaseContentHeightPx = intrinsic
  }
  if (!(fretboardBaseContentHeightPx > 0)) {
    corePadResizePx.value = 0
    return
  }
  const raw = Math.round(h - fretboardBaseContentHeightPx)
  corePadResizePx.value = Math.max(RESIZE_MIN, Math.min(RESIZE_MAX, raw))
}

const fretboardStyleVars = computed(() => ({
  '--fb-core-resize-pad-bottom': `${Math.max(0, Number(corePadResizePx.value) || 0)}px`,
  '--fb-core-resize-margin-bottom': `${Math.min(0, Number(corePadResizePx.value) || 0)}px`,
}))

const timelineIsPlaying = computed(() => Boolean(timelineRef.value?.isPlaying))
const timelinePlayhead = computed(() => Number(timelineRef.value?.playhead) || 0)
const timelineTotalDuration = computed(() => Number(timelineRef.value?.totalDuration) || 0)
const timelinePracticeActive = computed(() => Boolean(timelineRef.value?.practiceActive))
const timelinePracticeAvailable = computed(() => Boolean(timelineRef.value?.practiceAvailable))
const timelinePracticeTargetLabel = computed(() => String(timelineRef.value?.practiceTargetLabel || ''))
const timelinePracticeDetectedLabel = computed(() => String(timelineRef.value?.practiceDetectedLabel || ''))
const timelinePracticeHintText = computed(() => String(timelineRef.value?.practiceHintText || ''))
const timelinePracticeMatchState = computed(() => String(timelineRef.value?.practiceMatchState || ''))
const timelineRecordActive = computed(() => Boolean(timelineRef.value?.recordActive))

function timelineTogglePlay() {
  timelineRef.value?.togglePlay?.()
}

function timelineSeekStart() {
  timelineRef.value?.seekStart?.()
}

function timelineSeekPlayhead(v) {
  timelineRef.value?.seekPlayhead?.(v)
}

function timelineTogglePractice() {
  timelineRef.value?.togglePractice?.()
}

function timelineToggleRecord() {
  timelineRef.value?.toggleRecord?.()
}

async function saveAsNewToCloud() {
  if (saveAsNewBusy.value) return
  if (!auth.isSignedIn) {
    authOpen.value = true
    return
  }
  if (!hasNotes.value) return

  const title = String(saveAsNewTitle.value ?? '').trim()
  if (!title) return

  const kind = String(library.currentItem?.kind ?? 'song')
  const category = library.currentItem?.category ? String(library.currentItem.category) : ''
  const visibility = String(saveAsNewVisibility.value ?? 'private')

  saveAsNewBusy.value = true
  const created = await library.createItem({
      kind,
      title,
      visibility,
      category,
      content: buildSongSnapshot({
        name: songName.value,
        instrument,
        transport,
        timelineSettings,
        notes,
        handPositions,
      }),
    })
  saveAsNewBusy.value = false

  if (!created) {
    const msg = String(library.error?.message ?? library.error ?? 'Save As New failed')
    window.alert(msg)
    return
  }
  saveAsNewOpen.value = false
}

function openSaveAsNew() {
  const fromNameField = String(songName.value ?? '').trim()
  const base = String(library.currentItem?.title ?? '').trim()
  if (fromNameField) saveAsNewTitle.value = fromNameField
  else saveAsNewTitle.value = base ? `${base} (copy)` : 'New Recording'
  saveAsNewVisibility.value = 'private'
  saveAsNewOpen.value = true
}

function applyConfiguredDefaultTimelineLength() {
  const top = Number(timelineSettings.beatTop) || 4
  const bottom = Number(timelineSettings.beatBottom) || 4
  const blocksPerBar = Math.max(1, Number((top * (4 / bottom)).toFixed(3)))
  const bars = Math.max(1, Number(TIMELINE_LAYOUT.bars.defaultCount) || 2)
  timelineSettings.setTimelineLengthBlocks(Number((blocksPerBar * bars).toFixed(3)))
}

function resetEditorToDefaultLength() {
  notes.clearNotes()
  selection.clearSelection()
  applyConfiguredDefaultTimelineLength()
}

onMounted(async () => {
  updateViewportOrientationFlag()
  window.addEventListener('resize', updateViewportOrientationFlag)
  window.addEventListener('orientationchange', updateViewportOrientationFlag)
  installAudioAutoWarmup({ instrumentType: instrument.instrumentType })
  void initAudioEngine({ instrumentType: instrument.instrumentType })
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'guitarjemp' || storedTheme === 'guitarjempDark') {
    applyTheme(storedTheme)
  }
  applyConfiguredDefaultTimelineLength()
  await nextTick()
  const el = fretboardMainEl.value
  if (!el || typeof ResizeObserver === 'undefined') return
  updateFretboardResizeFromParentHeight(el.getBoundingClientRect().height)
  fretboardResizeObserver = new ResizeObserver((entries) => {
    const entry = entries?.[0]
    const h = Number(entry?.contentRect?.height) || 0
    updateFretboardResizeFromParentHeight(h)
  })
  fretboardResizeObserver.observe(el)
})

watch(
  () => instrument.instrumentType,
  (next) => {
    void initAudioEngine({ instrumentType: next })
  },
)

watch(isPhoneView, async (phone) => {
  if (phone) {
    corePadResizePx.value = 0
    return
  }
  await nextTick()
  const el = fretboardMainEl.value
  if (!el) return
  updateFretboardResizeFromParentHeight(el.getBoundingClientRect().height)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportOrientationFlag)
  window.removeEventListener('orientationchange', updateViewportOrientationFlag)
  fretboardResizeObserver?.disconnect?.()
  fretboardResizeObserver = null
})
</script>

<template>
  <div class="app-layout" :class="{ 'is-phone-view': viewMode === 'phone' }">
    <AuthDialog v-model="authOpen" />
    <ConnectionsDialog v-model="connectionsOpen" />

    <header class="app-topbar">
      <div class="app-topbar-title">GuitarJemp</div>
      <v-spacer />
      <div class="app-topbar-actions">
        <v-chip v-if="auth.isSignedIn" size="small" color="success" variant="tonal">
          {{ auth.profile?.display_name || auth.user?.user_metadata?.display_name || 'User' }}
        </v-chip>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="small" variant="tonal" prepend-icon="mdi-account">
              Account
            </v-btn>
          </template>
          <v-list density="compact" min-width="180">
            <v-list-item
              :prepend-icon="auth.isSignedIn ? 'mdi-logout' : 'mdi-login'"
              :title="auth.isSignedIn ? 'Logout' : 'Login'"
              @click="auth.isSignedIn ? auth.signOut() : (authOpen = true)"
            />
            <v-list-item
              prepend-icon="mdi-account-multiple"
              title="Friends"
              :disabled="!auth.isSignedIn"
              @click="connectionsOpen = true"
            />
          </v-list>
        </v-menu>
      </div>
    </header>
    <div class="app-menu-bar" aria-label="Main menu">
      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">File</v-btn>
        </template>
          <v-list density="compact" min-width="220">
            <v-list-item title="New" />
            <v-divider class="my-1" />
            <v-list-item title="Save" />
            <v-list-item title="Save As New" @click="openSaveAsNew" />
            <v-list-item title="Reset" @click="resetEditorToDefaultLength" />
            <v-divider class="my-1" />
            <v-list-item title="Export MusicXML" />
          <v-list-item title="Export MIDI" />
          <v-list-item title="Export PDF" />
          <v-divider class="my-1" />
          <v-list-item title="Import (Replace)" />
          <v-list-item title="Import (Append)" />
        </v-list>
      </v-menu>

      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Edit</v-btn>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item title="Undo" />
          <v-list-item title="Redo" />
          <v-divider class="my-1" />
          <v-list-item title="Preferences" @click="preferencesOpen = true" />
        </v-list>
      </v-menu>

      <v-menu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">View</v-btn>
        </template>
        <v-card class="pa-3 d-flex flex-column ga-2" min-width="280">
          <v-switch density="compact" hide-details inset :label="`Pane B: ${showLibraryInPaneB ? 'Library' : 'Timeline'}`"
            :model-value="showLibraryInPaneB"
            @update:model-value="(v) => (showLibraryInPaneB = Boolean(v))" />
          <div class="text-caption">Viewport</div>
          <v-btn-toggle
            :model-value="viewMode"
            mandatory
            divided
            @update:model-value="(v) => (viewMode = String(v || 'desktop'))"
          >
            <v-btn value="desktop" size="small" variant="tonal">Desktop</v-btn>
            <v-btn value="phone" size="small" variant="tonal">Phone</v-btn>
          </v-btn-toggle>
        </v-card>
      </v-menu>

      <v-menu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Window</v-btn>
        </template>
        <v-card class="pa-3 d-flex flex-column ga-2" min-width="280">
          <v-switch density="compact" hide-details inset label="Fretboard" :model-value="showFretboard"
            @update:model-value="(v) => (showFretboard = Boolean(v))" />
          <v-switch density="compact" hide-details inset label="Timeline" :model-value="showTimeline"
            @update:model-value="(v) => (showTimeline = Boolean(v))" />
          <v-switch density="compact" hide-details inset label="Transport" :model-value="showTransportBar"
            @update:model-value="(v) => (showTransportBar = Boolean(v))" />
        </v-card>
      </v-menu>

      <v-menu location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Language</v-btn>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item title="English" />
          <v-list-item title="Deutsch" />
        </v-list>
      </v-menu>

      <v-btn variant="text" size="small" class="app-menu-btn">Help</v-btn>

      <div class="app-menu-right">
        <v-menu v-if="isPhoneView" location="bottom end" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              variant="tonal"
              size="small"
              class="app-menu-tools-btn"
              prepend-icon="mdi-tools"
            >
              Tools
            </v-btn>
          </template>
          <v-card class="app-phone-tools-menu" min-width="260">
            <FretboardContextMenu />
          </v-card>
        </v-menu>
      </div>

      <div class="app-menu-center">
        <v-text-field
          v-model="songName"
          density="compact"
          variant="outlined"
          hide-details
          class="app-menu-name-input"
          placeholder="Name"
        />
      </div>
    </div>

    <main v-if="!showPhoneRotateOverlay" class="app-content">
      <LayoutManager class="app-window-manager">
        <template #pane-a>
          <div v-if="!isPhoneView && showFretboard" ref="fretboardMainEl" class="fretboard-main">
            <Fretboard :num-frets="numFrets" :editable="true" :core-resize-px="corePadResizePx" :style="fretboardStyleVars" />
          </div>
          <div v-else-if="isPhoneView && phonePane === 'fretboard' && showFretboard" ref="fretboardMainEl" class="fretboard-main">
            <Fretboard :num-frets="numFrets" :editable="true" :core-resize-px="corePadResizePx" :style="fretboardStyleVars" />
          </div>
          <Timeline
            v-else-if="isPhoneView && phonePane === 'timeline' && showTimeline"
            ref="timelineRef"
            :num-frets="numFrets"
            :library-panel-visible="false"
            :transport-visible="transportVisible"
            @update-transport-visible="(v) => (transportVisible = Boolean(v))"
          />
          <LibraryPanel v-else-if="isPhoneView && phonePane === 'library'" />
        </template>
        <template #pane-b>
          <LibraryPanel v-if="showLibraryInPaneB" />
          <Timeline v-else-if="showTimeline" ref="timelineRef" :num-frets="numFrets" :library-panel-visible="false"
            :transport-visible="transportVisible"
            @update-transport-visible="(v) => (transportVisible = Boolean(v))" />
        </template>
        <template #sidebar>
          <div class="app-sidebar-content">
            <div class="app-sidebar-title">Tools</div>
            <FretboardContextMenu class="app-sidebar-menu" />
          </div>
        </template>
      </LayoutManager>
    </main>
    <main v-else class="app-content app-phone-rotate-lock" aria-live="polite">
      <div class="app-phone-rotate-card">
        <div class="app-phone-rotate-title">Landscape Required</div>
        <div class="app-phone-rotate-text">Bitte Gerät drehen, um den Phone-View zu nutzen.</div>
      </div>
    </main>
    <TransportBar v-if="showTransportBar" :visible="transportVisible" :is-playing="timelineIsPlaying" :tempo="transport.tempo"
      :click-enabled="timelineSettings.clickEnabled" :count-in-enabled="timelineSettings.countInEnabled"
      :auto-follow-enabled="timelineSettings.autoFollowEnabled" :loop-enabled="timelineSettings.loopEnabled"
      :shuffle-enabled="timelineSettings.shuffleEnabled"
      :is-phone-view="isPhoneView"
      :phone-pane="phonePane"
      :playhead="timelinePlayhead" :total-duration="timelineTotalDuration"
      :practice-active="timelinePracticeActive" :practice-available="timelinePracticeAvailable"
      :practice-target-label="timelinePracticeTargetLabel" :practice-detected-label="timelinePracticeDetectedLabel"
      :practice-hint-text="timelinePracticeHintText" :practice-match-state="timelinePracticeMatchState"
      :record-active="timelineRecordActive" @toggle-play="timelineTogglePlay" @seek-start="timelineSeekStart"
      @seek-playhead="timelineSeekPlayhead" @update-tempo="transport.setTempo"
      @update-click="timelineSettings.setClickEnabled" @update-count-in-enabled="timelineSettings.setCountInEnabled"
      @update-auto-follow="timelineSettings.setAutoFollowEnabled" @update-loop="timelineSettings.setLoopEnabled"
      @update-shuffle="timelineSettings.setShuffleEnabled"
      @update-phone-pane="(v) => (phonePane = String(v || 'fretboard'))"
      @toggle-practice="timelineTogglePractice" @toggle-record="timelineToggleRecord" />

    <v-dialog v-model="saveAsNewOpen" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Save As New</span>
          <v-btn icon="mdi-close" variant="text" @click="saveAsNewOpen = false" />
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="saveAsNewTitle"
            label="Title"
            density="compact"
            variant="outlined"
            autofocus
          />
          <v-select
            v-model="saveAsNewVisibility"
            :items="[
              { title: 'Private', value: 'private' },
              { title: 'Connections', value: 'connections' },
              { title: 'Public', value: 'public' },
            ]"
            label="Visibility"
            density="compact"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="saveAsNewOpen = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!hasNotes || !String(saveAsNewTitle ?? '').trim() || saveAsNewBusy"
            @click="saveAsNewToCloud"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="preferencesOpen" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Preferences</span>
          <v-btn icon="mdi-close" variant="text" @click="preferencesOpen = false" />
        </v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-text-field
            v-model="preferenceToneDuration"
            label="Tone duration"
            density="compact"
            variant="outlined"
            type="number"
            min="0.1"
            step="0.1"
          />
          <v-switch
            v-model="preferenceSoundPreview"
            density="compact"
            hide-details
            inset
            label="Sound preview"
          />
          <v-switch
            v-model="preferenceDarkMode"
            density="compact"
            hide-details
            inset
            label="Dark mode"
          />
          <v-switch
            density="compact"
            hide-details
            inset
            label="Hand position track"
            :model-value="timelineSettings.handPositionVisible"
            @update:model-value="(v) => timelineSettings.setHandPositionVisible(Boolean(v))"
          />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="preferencesOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <footer class="app-footer">
      <span>GuitarJemp Workspace</span>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

.app-footer {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 14px;
  background: #111;
  color: #f3f3f3;
}

.app-topbar {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding-inline: 12px;
  border-bottom: 1px solid #2f2f2f;
  background: #111;
  color: #f3f3f3;
}

.app-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-topbar-title {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
}

.app-menu-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 30px;
  padding: 0 8px;
  border-bottom: 1px solid #c8c8c8;
  background: #efefef;
}

.app-menu-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(360px, 40vw);
  pointer-events: none;
}

.app-menu-right {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
}

.app-menu-tools-btn {
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
}

.app-phone-tools-menu {
  max-height: min(60vh, 420px);
  overflow: auto;
  padding: 8px;
}

.app-menu-name-input {
  pointer-events: auto;
}

.app-menu-name-input :deep(.v-field) {
  background: rgb(255 255 255 / 92%);
  min-height: 24px;
  height: 24px;
}

.app-menu-name-input :deep(.v-field__input) {
  min-height: 24px;
  height: 24px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}

.app-menu-btn {
  min-width: auto;
  padding-inline: 8px;
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
}

.app-menu-btn:hover {
  background: rgb(0 0 0 / 6%);
}

.app-footer {
  border-top: 1px solid #2f2f2f;
}

.app-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.app-window-manager {
  flex: 1 1 auto;
  min-height: 0;
}

.app-sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: #333;
}

.app-sidebar-content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
  box-sizing: border-box;
}

.app-sidebar-menu {
  flex: 1 1 auto;
  min-height: 0;
}

.app-layout :deep(.timeline-main) {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

.fretboard-main {
  position: relative;
  display: flex;
  align-items: flex-start;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

.fretboard-main :deep(.fretboard-body) {
  width: 100%;
}

.app-layout.is-phone-view :deep(.layout-manager) {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.app-layout.is-phone-view :deep(.layout-sidebar) {
  display: none;
}

.app-layout.is-phone-view :deep(.wm-pane-b),
.app-layout.is-phone-view :deep(.wm-divider) {
  display: none;
}

.app-layout.is-phone-view :deep(.wm-pane-a) {
  flex-basis: 100% !important;
}

.app-layout.is-phone-view .app-menu-center {
  width: min(240px, 56vw);
}

.app-phone-rotate-lock {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #101010;
  color: #f3f3f3;
  padding: 20px;
}

.app-phone-rotate-card {
  width: min(480px, 92vw);
  border: 2px solid #2d2d2d;
  border-radius: 12px;
  padding: 18px 16px;
  background: #181818;
}

.app-phone-rotate-title {
  font-size: 18px;
  font-weight: 700;
}

.app-phone-rotate-text {
  margin-top: 8px;
  font-size: 14px;
  color: #cfcfcf;
}
</style>
