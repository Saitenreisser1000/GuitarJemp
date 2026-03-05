<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LayoutManager from '@/components/app/LayoutManager.vue'
import Fretboard from '@/features/fretboard'
import Timeline from '@/features/timeline'
import { TransportBar } from '@/features/transport'
import FretboardContextMenu from '@/features/fretboard/components/FretboardContextMenu.vue'
import { AuthDialog, ConnectionsDialog, LibraryPanel, DashboardDetailPanel, UserDashboardMain } from '@/features/cloud'
import { useInstrumentStore } from '@/store/useInstrument'
import { useAuthStore } from '@/store/useAuth'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useLibraryStore } from '@/store/useLibrary'
import { useConnectionsStore } from '@/store/useConnections'
import { useShareContactsStore } from '@/store/useShareContacts'
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'
import { buildSongSnapshot } from '@/domain/song/songSnapshot'
import { buildExchangeClip } from '@/domain/exchange/clipExchange'
import { toMusicXml } from '@/domain/exchange/musicxml'
import { toMidiBytes } from '@/domain/exchange/midi'
import { toPdfBytes } from '@/domain/exchange/pdf'
import { downloadBinaryFile, downloadTextFile } from '@/infra/files/download'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { initAudioEngine, installAudioAutoWarmup } from '@/domain/audio/simpleSynth'
import { useI18n } from '@/i18n'
import { useTheme } from 'vuetify'

const numFrets = ref(12)
const corePadResizePx = ref(0)
const fretboardMainEl = ref(null)
const timelineRef = ref(null)
const timelineUndoTick = ref(0)
const timelineRedoTick = ref(0)
const transportVisible = ref(true)
const showFretboard = ref(true)
const showTimeline = ref(true)
const showTransportBar = ref(true)
const showLibraryInPaneB = ref(false)
const sidebarVisible = ref(true)
const mainView = ref('workspace')
const dashboardPanel = ref('library')
const viewMode = ref('desktop')
const phonePane = ref('fretboard')
const isPortraitViewport = ref(false)
const authOpen = ref(false)
const connectionsOpen = ref(false)
const newSongOpen = ref(false)
const songDialogMode = ref('new')
const newSongTitle = ref('')
const newSongBeatTop = ref(4)
const newSongBeatBottom = ref(4)
const newSongKey = ref('C')
const newSongBars = ref(2)
const newSongPickupEnabled = ref(false)
const newSongPickupBeats = ref(1)
const newSongShuffleEnabled = ref(false)
const newSongBpm = ref(120)
const saveAsNewOpen = ref(false)
const saveAsNewTitle = ref('')
const saveAsNewVisibility = ref('private')
const saveAsNewCategory = ref('')
const saveAsNewBusy = ref(false)
const saveBusy = ref(false)
const preferencesOpen = ref(false)
const profileSaveBusy = ref(false)
const songName = ref('')
const THEME_STORAGE_KEY = 'guitarjemp.ui.theme'

const instrument = useInstrumentStore()
const auth = useAuthStore()
const notes = useNotesStore()
const selection = useSelectionStore()
const handPositions = useHandPositionsStore()
const transport = useTransportStore()
const timelineSettings = useTimelineSettingsStore()
const library = useLibraryStore()
const connections = useConnectionsStore()
const shareContacts = useShareContactsStore()
const harmony = useHarmonyMenuStore()
const theme = useTheme()
const { locale, languages, setLocale } = useI18n()
const SONG_KEY_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const hasNotes = computed(() => (notes.activeNotes?.length ?? 0) > 0)
const currentUserDisplayName = computed(
  () =>
    String(
      auth.profile?.display_name ||
      auth.user?.user_metadata?.display_name ||
      auth.user?.email ||
      'User',
    ),
)
const currentUserAvatarUrl = computed(() => {
  const direct = String(auth.user?.user_metadata?.avatar_url || '').trim()
  if (direct) return direct
  const name = encodeURIComponent(currentUserDisplayName.value)
  return `https://ui-avatars.com/api/?name=${name}&background=1f2937&color=ffffff&size=64&bold=true`
})
const shareContactsForMenu = computed(() =>
  (shareContacts.contacts || []).map((c) => {
    const name = String(c?.name || '').trim()
    const email = String(c?.email || '').trim()
    const whatsapp = String(c?.whatsapp || '').trim()
    return {
      id: String(c?.id || `${name}-${email}-${whatsapp}`),
      name: name || 'Unbenannter Kontakt',
      email,
      whatsapp,
      hasEmail: Boolean(email),
      hasWhatsApp: Boolean(whatsapp),
    }
  }),
)
const canSaveAsNew = computed(() => hasNotes.value)
const canOverwriteCurrentLibraryItem = computed(() => {
  const currentId = String(library.currentItem?.id ?? '').trim()
  const ownerId = String(library.currentItem?.owner_id ?? '').trim()
  const meId = String(auth.user?.id ?? '').trim()
  if (!auth.isSignedIn) return false
  if (!currentId || !ownerId || !meId) return false
  return ownerId === meId
})
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
const preferenceIntervalsOnDots = computed({
  get: () => Boolean(timelineSettings.showIntervalsOnDots),
  set: (v) => timelineSettings.setShowIntervalsOnDots(Boolean(v)),
})
const languageItems = computed(() => languages.map((l) => ({ title: l.label, value: l.code })))
const preferenceLanguage = computed({
  get: () => String(locale.value || 'en'),
  set: (v) => {
    void setLocale(String(v || 'en'))
  },
})
const isPhoneView = computed(() => viewMode.value === 'phone')
const isWatchView = computed(() => viewMode.value === 'watch')
const isCompactView = computed(() => isPhoneView.value || isWatchView.value)
const showPhoneRotateOverlay = computed(() => isCompactView.value && isPortraitViewport.value)
const PHONE_VIEW_BREAKPOINT_PX = 860

function applyTheme(name) {
  const next = name === 'guitarjempDark' ? 'guitarjempDark' : 'guitarjemp'
  theme.global.name.value = next
  localStorage.setItem(THEME_STORAGE_KEY, next)
}

function updateViewportOrientationFlag() {
  if (typeof window === 'undefined') return
  isPortraitViewport.value = window.innerHeight > window.innerWidth
}

function shouldDefaultToPhoneView() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  const narrow = window.matchMedia(`(max-width: ${PHONE_VIEW_BREAKPOINT_PX}px)`).matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  return narrow && coarse
}

const fretboardStyleVars = computed(() => ({
  '--fb-core-resize-pad-bottom': '0px',
  '--fb-core-resize-margin-bottom': '0px',
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

async function saveCurrentSong() {
  if (saveBusy.value || saveAsNewBusy.value) return

  const snapshot = buildSongSnapshot({
    name: songName.value,
    instrument,
    transport,
    timelineSettings,
    notes,
    handPositions,
  })

  if (!canOverwriteCurrentLibraryItem.value) {
    openSaveAsNew()
    return
  }

  const id = String(library.currentItem?.id ?? '').trim()
  if (!id) {
    openSaveAsNew()
    return
  }

  saveBusy.value = true
  const updated = await library.updateItem({ id, content: snapshot })
  saveBusy.value = false

  if (!updated) {
    const msg = String(library.error?.message ?? library.error ?? 'Save failed')
    window.alert(msg)
  }
}

function normalizeDashboardPanel(panel) {
  const allowed = new Set(['library', 'profile', 'categories', 'connections', 'share'])
  const next = String(panel || 'library')
  return allowed.has(next) ? next : 'library'
}

async function openDashboard(initialPanel = 'library') {
  if (auth.isSignedIn) {
    await Promise.all([library.refresh(), connections.refresh()])
  }
  dashboardPanel.value = normalizeDashboardPanel(initialPanel)
  mainView.value = 'dashboard'
}

function closeDashboard() {
  mainView.value = 'workspace'
}

function selectDashboardPanel(panel) {
  dashboardPanel.value = normalizeDashboardPanel(panel)
}

async function openShareManager() {
  await openDashboard('share')
}

function getShareUrl() {
  if (typeof window === 'undefined') return 'https://saitenreisser1000.github.io/GuitarJemp/'
  return window.location.href
}

function normalizeWhatsappNumber(raw) {
  const source = String(raw || '').trim()
  if (!source) return ''
  const plus = source.startsWith('+') ? '+' : ''
  const digits = source.replace(/[^\d]/g, '')
  if (!digits) return ''
  return `${plus}${digits}`
}

function buildShareMessage(name) {
  const safeName = String(name || 'there').trim() || 'there'
  return `Hi ${safeName}, check this GuitarJemp page: ${getShareUrl()}`
}

function shareByMail(contact) {
  const email = String(contact?.email || '').trim()
  if (!email) return
  const subject = encodeURIComponent('GuitarJemp Link')
  const body = encodeURIComponent(buildShareMessage(contact?.name))
  const href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`
  if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener')
}

function shareByWhatsApp(contact) {
  const number = normalizeWhatsappNumber(contact?.whatsapp)
  if (!number) return
  const text = encodeURIComponent(buildShareMessage(contact?.name))
  const target = number.startsWith('+') ? number.slice(1) : number
  const href = `https://wa.me/${target}?text=${text}`
  if (typeof window !== 'undefined') window.open(href, '_blank', 'noopener')
}

function shareContact(contact, mode) {
  const nextMode = String(mode || '')
  if (nextMode === 'email') {
    shareByMail(contact)
    return
  }
  if (nextMode === 'whatsapp') {
    shareByWhatsApp(contact)
    return
  }
  if (nextMode === 'both') {
    shareByMail(contact)
    setTimeout(() => shareByWhatsApp(contact), 180)
  }
}

async function saveDashboardProfile(payload) {
  if (profileSaveBusy.value) return
  profileSaveBusy.value = true
  const ok = await auth.updateProfile(payload || {})
  profileSaveBusy.value = false
  if (!ok) {
    const msg = String(auth.error?.message ?? auth.error ?? 'Profile save failed')
    window.alert(msg)
    return
  }
  if (auth.isSignedIn) {
    await Promise.all([library.refresh(), connections.refresh()])
  }
}

function triggerUndo() {
  timelineUndoTick.value += 1
}

function triggerRedo() {
  timelineRedoTick.value += 1
}

function exportBaseName() {
  const raw = String(songName.value || 'guitarjemp-export').trim()
  const normalized = raw
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || 'guitarjemp-export'
}

function buildCurrentExportClip() {
  return buildExchangeClip({
    notes: notes.activeNotes,
    instrument,
    transport,
    settings: timelineSettings,
  })
}

function exportMusicXml() {
  const clip = buildCurrentExportClip()
  const xml = toMusicXml(clip, { title: exportBaseName() })
  downloadTextFile(`${exportBaseName()}.musicxml`, xml, 'application/vnd.recordare.musicxml+xml;charset=utf-8')
}

function exportMidi() {
  const clip = buildCurrentExportClip()
  const bytes = toMidiBytes(clip)
  downloadBinaryFile(`${exportBaseName()}.mid`, bytes, 'audio/midi')
}

function exportPdf() {
  const clip = buildCurrentExportClip()
  const keySignature = String(harmony.scaleRoot || harmony.chordRoot || newSongKey.value || 'C').toUpperCase()
  const bytes = toPdfBytes(clip, {
    title: String(songName.value || exportBaseName()),
    keySignature,
    fretCount: Number(numFrets.value) || 12,
  })
  downloadBinaryFile(`${exportBaseName()}.pdf`, bytes, 'application/pdf')
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
  const category = String(saveAsNewCategory.value ?? '').trim()
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
  const currentCategory = String(library.currentItem?.category ?? '').trim()
  if (fromNameField) saveAsNewTitle.value = fromNameField
  else saveAsNewTitle.value = base ? `${base} (copy)` : 'New Recording'
  saveAsNewVisibility.value = 'private'
  saveAsNewCategory.value = currentCategory
  saveAsNewOpen.value = true
}

function fillSongDialogFromCurrentState() {
  newSongTitle.value = String(songName.value || '').trim()
  newSongBeatTop.value = Number(timelineSettings.beatTop) || 4
  newSongBeatBottom.value = Number(timelineSettings.beatBottom) || 4
  const key = String(harmony.scaleRoot || harmony.chordRoot || 'C').toUpperCase()
  newSongKey.value = SONG_KEY_OPTIONS.includes(key) ? key : 'C'
  const barSize = Math.max(
    1,
    (Number(timelineSettings.beatTop) || 4) * (4 / (Number(timelineSettings.beatBottom) || 4)),
  )
  const bars = Math.max(1, Math.round((Number(timelineSettings.timelineLengthBlocks) || 0) / barSize))
  newSongBars.value = bars || 2
  newSongPickupEnabled.value = Boolean(timelineSettings.pickupEnabled)
  newSongPickupBeats.value = Number(timelineSettings.pickupBeats) || 1
  newSongShuffleEnabled.value = Boolean(timelineSettings.shuffleEnabled)
  newSongBpm.value = Number(transport.tempo) || 120
}

function openNewSongDialog() {
  songDialogMode.value = 'new'
  fillSongDialogFromCurrentState()
  newSongOpen.value = true
}

function openSongSettingsDialog() {
  songDialogMode.value = 'edit'
  fillSongDialogFromCurrentState()
  newSongOpen.value = true
}

function applyNewSong() {
  const title = String(newSongTitle.value || '').trim()
  songName.value = title
  const beatTop = Math.max(1, Math.floor(Number(newSongBeatTop.value) || 4))
  const beatBottomRaw = Math.floor(Number(newSongBeatBottom.value) || 4)
  const beatBottom = [1, 2, 4, 8].includes(beatBottomRaw) ? beatBottomRaw : 4
  const bars = Math.max(1, Math.floor(Number(newSongBars.value) || 2))
  const bpm = Math.max(30, Math.min(260, Math.floor(Number(newSongBpm.value) || 120)))
  const pickupEnabled = Boolean(newSongPickupEnabled.value)
  const pickupBeats = Math.max(1, Math.floor(Number(newSongPickupBeats.value) || 1))
  const shuffleEnabled = Boolean(newSongShuffleEnabled.value)
  const key = String(newSongKey.value || 'C').toUpperCase()

  if (songDialogMode.value === 'new') {
    notes.clearNotes()
    selection.clearSelection()
    handPositions.setHandPositions([])
    transport.setPlayState('stopped')
    transport.setPlayheadMs(0)
  }
  transport.setTempo(bpm)

  timelineSettings.setBeatTop(beatTop)
  timelineSettings.setBeatBottom(beatBottom)
  timelineSettings.setPickupEnabled(pickupEnabled)
  timelineSettings.setPickupBeats(pickupBeats)
  timelineSettings.setShuffleEnabled(shuffleEnabled)
  timelineSettings.setLoopEnabled(false)
  const blocksPerBar = Math.max(1, Number((beatTop * (4 / beatBottom)).toFixed(3)))
  timelineSettings.setTimelineLengthBlocks(Number((bars * blocksPerBar).toFixed(3)))

  if (SONG_KEY_OPTIONS.includes(key)) {
    harmony.scaleRoot = key
    harmony.chordRoot = key
  }

  newSongOpen.value = false
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
  if (viewMode.value === 'desktop' && shouldDefaultToPhoneView()) {
    viewMode.value = 'phone'
  }
  updateViewportOrientationFlag()
  window.addEventListener('resize', updateViewportOrientationFlag)
  window.addEventListener('orientationchange', updateViewportOrientationFlag)
  installAudioAutoWarmup({ instrumentType: instrument.instrumentType })
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'guitarjemp' || storedTheme === 'guitarjempDark') {
    applyTheme(storedTheme)
  }
  applyConfiguredDefaultTimelineLength()
  corePadResizePx.value = 0
})

watch(
  () => instrument.instrumentType,
  (next) => {
    void initAudioEngine({ instrumentType: next })
  },
)

watch(isCompactView, (compact) => {
  if (compact) corePadResizePx.value = 0
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportOrientationFlag)
  window.removeEventListener('orientationchange', updateViewportOrientationFlag)
})
</script>

<template>
  <div
    class="app-layout"
    :class="{
      'is-phone-view': isPhoneView,
      'is-watch-view': isWatchView,
      'is-compact-view': isCompactView,
      'is-sidebar-hidden': !sidebarVisible,
    }"
  >
    <AuthDialog v-model="authOpen" />
    <ConnectionsDialog v-model="connectionsOpen" />

    <div class="app-menu-bar" aria-label="Main menu">
      <div class="app-menu-brand">GuitarJemp</div>
      <v-menu v-if="isPhoneView" location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            icon="mdi-menu"
            variant="text"
            size="small"
            class="app-menu-btn app-hamburger-btn"
            aria-label="Open menu"
          />
        </template>
        <v-list density="compact" min-width="260">
          <v-list-subheader>File</v-list-subheader>
          <v-list-item title="New" @click="openNewSongDialog" />
          <v-list-item title="Save" @click="saveCurrentSong" />
          <v-list-item title="Save As New" @click="openSaveAsNew" />
          <v-list-item title="Reset" @click="resetEditorToDefaultLength" />
          <v-divider class="my-1" />
          <v-list-subheader>Edit</v-list-subheader>
          <v-list-item title="Undo" @click="triggerUndo" />
          <v-list-item title="Redo" @click="triggerRedo" />
          <v-list-item title="Preferences" @click="preferencesOpen = true" />
          <v-divider class="my-1" />
          <v-list-subheader>Song</v-list-subheader>
          <v-list-item title="Song Settings" @click="openSongSettingsDialog" />
          <v-divider class="my-1" />
          <v-list-subheader>Account</v-list-subheader>
          <v-list-item
            prepend-icon="mdi-view-dashboard-outline"
            title="Dashboard"
            @click="openDashboard"
          />
          <v-divider class="my-1" />
          <v-list-subheader>View</v-list-subheader>
          <v-list-item title="Desktop" @click="viewMode = 'desktop'" />
          <v-list-item title="Phone" @click="viewMode = 'phone'" />
          <v-list-item title="Watch" @click="viewMode = 'watch'" />
        </v-list>
      </v-menu>
      <v-menu v-else location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">File</v-btn>
        </template>
          <v-list density="compact" min-width="220">
            <v-list-item title="New" @click="openNewSongDialog" />
            <v-divider class="my-1" />
            <v-list-item title="Save" @click="saveCurrentSong" />
            <v-list-item title="Save As New" @click="openSaveAsNew" />
            <v-list-item title="Reset" @click="resetEditorToDefaultLength" />
            <v-divider class="my-1" />
            <v-list-item title="Export MusicXML" :disabled="!hasNotes" @click="exportMusicXml" />
          <v-list-item title="Export MIDI" :disabled="!hasNotes" @click="exportMidi" />
          <v-list-item title="Export PDF" :disabled="!hasNotes" @click="exportPdf" />
          <v-divider class="my-1" />
          <v-list-item title="Import (Replace)" />
          <v-list-item title="Import (Append)" />
        </v-list>
      </v-menu>

      <v-menu v-if="!isPhoneView" location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Edit</v-btn>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item title="Undo" @click="triggerUndo" />
          <v-list-item title="Redo" @click="triggerRedo" />
          <v-divider class="my-1" />
          <v-list-item title="Preferences" @click="preferencesOpen = true" />
        </v-list>
      </v-menu>

      <v-menu v-if="!isPhoneView" location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Song</v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item title="Song Settings" @click="openSongSettingsDialog" />
        </v-list>
      </v-menu>

      <v-menu v-if="!isPhoneView" location="bottom start" :close-on-content-click="false">
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
            <v-btn value="watch" size="small" variant="tonal">Watch</v-btn>
          </v-btn-toggle>
        </v-card>
      </v-menu>
      <v-btn
        v-if="!isCompactView"
        variant="text"
        size="small"
        class="app-menu-btn"
        :active="sidebarVisible"
        @click="sidebarVisible = !sidebarVisible"
      >
        Toolbar
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        class="app-menu-btn"
        :active="mainView === 'dashboard'"
        @click="mainView === 'dashboard' ? closeDashboard() : openDashboard()"
      >
        Dashboard
      </v-btn>
      <v-menu v-if="mainView !== 'dashboard'" location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">Share</v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item
            prepend-icon="mdi-account-edit-outline"
            title="Kontakte verwalten"
            @click="openShareManager"
          />
          <v-divider class="my-1" />
          <v-list-subheader>Kontakte</v-list-subheader>
          <v-list-group v-for="contact in shareContactsForMenu" :key="contact.id" :value="contact.id">
            <template #activator="{ props: groupProps }">
              <v-list-item
                v-bind="groupProps"
                :title="contact.name"
                prepend-icon="mdi-account"
              >
                <template #append>
                  <div class="d-inline-flex align-center ga-1">
                    <v-icon v-if="contact.hasEmail" size="16" icon="mdi-email-outline" />
                    <v-icon v-if="contact.hasWhatsApp" size="16" icon="mdi-whatsapp" />
                  </div>
                </template>
              </v-list-item>
            </template>
            <v-list-item
              v-if="contact.hasEmail"
              title="Per Mail senden"
              prepend-icon="mdi-email-outline"
              @click="shareContact(contact, 'email')"
            />
            <v-list-item
              v-if="contact.hasWhatsApp"
              title="Per WhatsApp senden"
              prepend-icon="mdi-whatsapp"
              @click="shareContact(contact, 'whatsapp')"
            />
            <v-list-item
              v-if="contact.hasEmail && contact.hasWhatsApp"
              title="Per Mail + WhatsApp senden"
              prepend-icon="mdi-send-circle-outline"
              @click="shareContact(contact, 'both')"
            />
            <v-list-item
              v-if="!contact.hasEmail && !contact.hasWhatsApp"
              title="Keine Mail/WhatsApp hinterlegt"
              prepend-icon="mdi-alert-circle-outline"
              disabled
            />
          </v-list-group>
          <v-list-item v-if="shareContactsForMenu.length === 0" title="Keine Kontakte" />
        </v-list>
      </v-menu>

      <div class="app-menu-right">
        <v-chip
          v-if="auth.isSignedIn && !isPhoneView"
          size="small"
          color="success"
          variant="tonal"
          :prepend-avatar="currentUserAvatarUrl"
        >
          {{ currentUserDisplayName }}
        </v-chip>
        <v-menu v-if="isCompactView && !isWatchView" location="bottom end" :close-on-content-click="false">
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
        <v-btn
          v-else-if="isWatchView"
          variant="tonal"
          size="small"
          class="app-menu-tools-btn"
          prepend-icon="mdi-tools"
          disabled
        >
          Tools
        </v-btn>
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
            <v-list-item
              prepend-icon="mdi-view-dashboard-outline"
              title="Dashboard"
              @click="openDashboard"
            />
          </v-list>
        </v-menu>
      </div>

    </div>

    <main v-if="!showPhoneRotateOverlay || mainView === 'dashboard'" class="app-content">
      <div v-if="mainView === 'dashboard'" class="app-dashboard-main">
        <UserDashboardMain
          :signed-in="auth.isSignedIn"
          :user="auth.user"
          :profile="auth.profile"
          :instrument-type="instrument.instrumentType"
          :library-items="library.items"
          :accepted-count="connections.accepted.length"
          :incoming-count="connections.incoming.length"
          :outgoing-count="connections.outgoing.length"
          :share-count="shareContacts.contacts.length"
          :song-name="songName"
          :active-panel="dashboardPanel"
          @open-auth="authOpen = true"
          @open-connections="connectionsOpen = true"
          @open-preferences="preferencesOpen = true"
          @select-panel="selectDashboardPanel"
          @close-dashboard="closeDashboard"
        />
        <div class="app-dashboard-right">
          <LibraryPanel v-if="dashboardPanel === 'library'" />
          <DashboardDetailPanel
            v-else
            :panel="dashboardPanel"
            :signed-in="auth.isSignedIn"
            :user="auth.user"
            :profile="auth.profile"
            :instrument-type="instrument.instrumentType"
            :library-items="library.items"
            :accepted="connections.accepted"
            :incoming="connections.incoming"
            :outgoing="connections.outgoing"
            :user-label-fn="connections.userLabel"
            :profile-saving="profileSaveBusy"
            @open-auth="authOpen = true"
            @save-profile="saveDashboardProfile"
          />
        </div>
      </div>
      <LayoutManager v-else class="app-window-manager">
        <template #pane-a>
          <div v-if="!isCompactView && showFretboard" ref="fretboardMainEl" class="fretboard-main">
            <Fretboard
              :num-frets="numFrets"
              :editable="true"
              :core-resize-px="corePadResizePx"
              :is-phone-view="false"
              :style="fretboardStyleVars"
            />
          </div>
          <div v-else-if="isCompactView && phonePane === 'fretboard' && showFretboard" ref="fretboardMainEl" class="fretboard-main">
            <Fretboard
              :num-frets="numFrets"
              :editable="!isWatchView"
              :core-resize-px="corePadResizePx"
              :is-phone-view="isPhoneView"
              :style="fretboardStyleVars"
            />
          </div>
          <Timeline
            v-else-if="isCompactView && phonePane === 'timeline' && showTimeline"
            ref="timelineRef"
            :num-frets="numFrets"
            :library-panel-visible="false"
            :transport-visible="transportVisible"
            :external-undo-tick="timelineUndoTick"
            :external-redo-tick="timelineRedoTick"
            @update-transport-visible="(v) => (transportVisible = Boolean(v))"
          />
          <LibraryPanel v-else-if="isCompactView && phonePane === 'library'" />
        </template>
        <template #pane-b>
          <LibraryPanel v-if="showLibraryInPaneB" />
          <Timeline v-else-if="showTimeline" ref="timelineRef" :num-frets="numFrets" :library-panel-visible="false"
            :transport-visible="transportVisible"
            :external-undo-tick="timelineUndoTick"
            :external-redo-tick="timelineRedoTick"
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
    <TransportBar v-if="showTransportBar && mainView !== 'dashboard'" :visible="transportVisible" :is-playing="timelineIsPlaying" :tempo="transport.tempo"
      :click-enabled="timelineSettings.clickEnabled" :count-in-enabled="timelineSettings.countInEnabled"
      :auto-follow-enabled="timelineSettings.autoFollowEnabled" :loop-enabled="timelineSettings.loopEnabled"
      :shuffle-enabled="timelineSettings.shuffleEnabled"
      :instrument-type="instrument.instrumentType"
      :is-phone-view="isCompactView"
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
          <v-text-field
            v-model="saveAsNewCategory"
            label="Category"
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

    <v-dialog v-model="newSongOpen" max-width="560">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>{{ songDialogMode === 'new' ? 'New Song' : 'Song Settings' }}</span>
          <v-btn icon="mdi-close" variant="text" @click="newSongOpen = false" />
        </v-card-title>
        <v-card-text class="d-flex flex-column ga-3">
          <v-text-field
            v-model="newSongTitle"
            label="Title"
            density="compact"
            variant="outlined"
            autofocus
          />
          <div class="d-flex ga-2">
            <v-text-field
              v-model="newSongBeatTop"
              label="Beat Top"
              density="compact"
              variant="outlined"
              type="number"
              min="1"
              class="flex-1-1"
            />
            <v-select
              v-model="newSongBeatBottom"
              :items="[1, 2, 4, 8]"
              label="Beat Bottom"
              density="compact"
              variant="outlined"
              class="flex-1-1"
            />
          </div>
          <div class="d-flex ga-2">
            <v-select
              v-model="newSongKey"
              :items="SONG_KEY_OPTIONS"
              label="Key"
              density="compact"
              variant="outlined"
              class="flex-1-1"
            />
            <v-text-field
              v-model="newSongBars"
              label="Bars"
              density="compact"
              variant="outlined"
              type="number"
              min="1"
              class="flex-1-1"
            />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-switch
              v-model="newSongPickupEnabled"
              density="compact"
              hide-details
              inset
              label="Pickup"
            />
            <v-text-field
              v-model="newSongPickupBeats"
              label="Pickup Beats"
              density="compact"
              variant="outlined"
              type="number"
              min="1"
              :disabled="!newSongPickupEnabled"
              class="flex-1-1"
            />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-switch
              v-model="newSongShuffleEnabled"
              density="compact"
              hide-details
              inset
              label="Shuffle"
            />
            <v-text-field
              v-model="newSongBpm"
              label="BPM"
              density="compact"
              variant="outlined"
              type="number"
              min="30"
              max="260"
              class="flex-1-1"
            />
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="newSongOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="applyNewSong">
            {{ songDialogMode === 'new' ? 'Create' : 'Apply' }}
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
            v-model="preferenceIntervalsOnDots"
            density="compact"
            hide-details
            inset
            label="Intervals on dots"
          />
          <v-switch
            density="compact"
            hide-details
            inset
            label="Hand position track"
            :model-value="timelineSettings.handPositionVisible"
            @update:model-value="(v) => timelineSettings.setHandPositionVisible(Boolean(v))"
          />
          <v-select
            v-model="preferenceLanguage"
            :items="languageItems"
            label="Language"
            density="compact"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="preferencesOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <footer class="app-footer">
      <span>GuitarJemp ©</span>
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
  height: 31px;
  padding: 0 14px;
  background: #111;
  color: #f3f3f3;
}

.app-menu-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 6px 10px;
  border-bottom: 1px solid #2f2f2f;
  background: #111;
  color: #f3f3f3;
}

.app-menu-brand {
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
  padding-right: 8px;
  margin-right: 4px;
  border-right: 1px solid rgb(255 255 255 / 18%);
}

.app-menu-right {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.app-menu-btn {
  min-width: auto;
  padding-inline: 8px;
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
  color: #f3f3f3;
}

.app-menu-btn:hover {
  background: rgb(255 255 255 / 10%);
}

.app-hamburger-btn {
  margin-left: 2px;
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

.app-dashboard-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  flex: 1 1 auto;
  min-height: 0;
}

.app-dashboard-right {
  min-width: 0;
  min-height: 0;
  border-left: 1px solid #d6d6d6;
  overflow: hidden;
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
  overflow-x: hidden;
  overflow-y: auto;
}

.fretboard-main :deep(.fretboard-body) {
  width: 100%;
  height: 100%;
}

.app-layout.is-compact-view :deep(.layout-manager) {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.app-layout.is-compact-view :deep(.layout-sidebar) {
  display: none;
}

.app-layout.is-compact-view :deep(.wm-pane-b),
.app-layout.is-compact-view :deep(.wm-divider) {
  display: none;
}

.app-layout.is-compact-view :deep(.wm-pane-a) {
  flex-basis: 100% !important;
}

.app-layout.is-sidebar-hidden :deep(.layout-manager) {
  grid-template-columns: minmax(0, 1fr);
}

.app-layout.is-sidebar-hidden :deep(.layout-sidebar) {
  display: none;
}

@media (max-width: 900px) {
  .app-dashboard-main {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .app-dashboard-right {
    border-left: 0;
    border-top: 1px solid #d6d6d6;
  }
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

.flex-1-1 {
  flex: 1 1 0;
}
</style>
