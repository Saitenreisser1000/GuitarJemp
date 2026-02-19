<script setup>
import Fretboard from '@/features/fretboard'
import ActiveTonesWindow from '@/features/activeTones'
import Timeline from '@/features/timeline'
import ChordMenu from '@/features/chord'
import ScaleMenu from '@/features/scale'
import { AuthDialog, LibraryDialog, ConnectionsDialog, LibraryPanel } from '@/features/cloud'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useInstrumentStore } from '@/store/useInstrument'
import { useAuthStore } from '@/store/useAuth'
import { useNotesStore } from '@/store/useNotes'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { useLibraryStore } from '@/store/useLibrary'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { isSupabaseConfigured } from '@/infra/supabase/client'
import { useTheme } from 'vuetify'
import { buildExchangeClip } from '@/domain/exchange/clipExchange'
import { toMusicXml } from '@/domain/exchange/musicxml'
import { toMidiBytes } from '@/domain/exchange/midi'
import { toPdfBytes } from '@/domain/exchange/pdf'
import { downloadBinaryFile, downloadTextFile } from '@/infra/files/download'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { parseMidiToClip } from '@/domain/exchange/importMidi'
import { getTuning } from '@/domain/music/tunings'
import { useI18n } from '@/i18n/useI18n'
import FretboardRail from '@/features/fretboard/components/FretboardRail.vue'
import TopPanelModeRail from '@/components/app/TopPanelModeRail.vue'
import SharePanel from '@/components/app/SharePanel.vue'

const instrument = useInstrumentStore()
const auth = useAuthStore()
const notes = useNotesStore()
const timelineSettings = useTimelineSettingsStore()
const transport = useTransportStore()
const library = useLibraryStore()
const handPositions = useHandPositionsStore()
const { locale, languages, setLocale, t } = useI18n()

const authOpen = ref(false)
const libraryOpen = ref(false)
const connectionsOpen = ref(false)

const numFrets = ref(12)
const activeNotesVisible = ref(false)
const fretboardVisible = ref(true)
const chordMenuVisible = ref(false)
const scaleMenuVisible = ref(false)
const timelineVisible = ref(true)
const transportVisible = ref(true)
const libraryPanelVisible = ref(false)
const externalUndoTick = ref(0)
const externalRedoTick = ref(0)
const fretboardCardEl = ref(null)
const fretboardCardHeightPx = ref(0)
let fretboardCardResizeObserver = null
let onWindowResize = null

const saveBusy = ref(false)
const saveError = ref('')

const saveAsNewOpen = ref(false)
const saveAsNewTitle = ref('')
const saveAsNewVisibility = ref('private')
const saveAsNewBusy = ref(false)
const draftKind = ref('song')
const importFileInput = ref(null)
const importMode = ref('replace')
const importErrorOpen = ref(false)
const importErrorTitle = ref('')
const importErrorDetails = ref('')
const preferencesOpen = ref(false)
const topPanelMode = ref('timeline')
const shareEmail = ref('')

const THEME_STORAGE_KEY = 'guitarjemp.ui.theme'
const TOP_PANEL_MODE_STORAGE_KEY = 'guitarjemp.topPanelMode'
const theme = useTheme()
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

function applyTheme(name) {
  const next = name === 'guitarjempDark' ? 'guitarjempDark' : 'guitarjemp'
  theme.global.name.value = next
  localStorage.setItem(THEME_STORAGE_KEY, next)
}

function toggleTheme() {
  applyTheme(isDarkTheme.value ? 'guitarjemp' : 'guitarjempDark')
}

function normalizeTopPanelMode(v) {
  const next = String(v || '').toLowerCase()
  if (next === 'timeline' || next === 'library' || next === 'share') return next
  return 'timeline'
}

function setTopPanelMode(v) {
  const next = normalizeTopPanelMode(v)
  topPanelMode.value = next
  localStorage.setItem(TOP_PANEL_MODE_STORAGE_KEY, next)
}

onMounted(() => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'guitarjemp' || stored === 'guitarjempDark') {
    applyTheme(stored)
    return
  }

  const prefersDark = Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  applyTheme(prefersDark ? 'guitarjempDark' : 'guitarjemp')
})

const hasNotes = computed(() => (notes.activeNotes?.length ?? 0) > 0)
const canUpdateCurrentItem = computed(() => {
  const item = library.currentItem
  const uid = auth.user?.id
  const ownerId = item?.owner_id
  return Boolean(uid && ownerId && uid === ownerId)
})

const canSave = computed(() => {
  if (!isSupabaseConfigured) return false
  if (!auth.isSignedIn) return false
  if (!hasNotes.value) return false
  if (!library.currentItem?.id) return false
  if (!canUpdateCurrentItem.value) return false
  return true
})

function makeSnapshot() {
  return {
    version: 1,
    instrument: {
      instrumentType: instrument.instrumentType,
      tuningId: instrument.tuningId,
      numStrings: instrument.numStrings,
    },
    transport: {
      tempo: transport.tempo,
    },
    timelineSettings: {
      selectedMode: timelineSettings.selectedMode,
      lastRhythmMode: timelineSettings.lastRhythmMode,
      snapEnabled: timelineSettings.snapEnabled,
      soundPreviewEnabled: timelineSettings.soundPreviewEnabled,
      clickEnabled: timelineSettings.clickEnabled,
      countInEnabled: timelineSettings.countInEnabled,
      loopEnabled: timelineSettings.loopEnabled,
      loopStartBlock: timelineSettings.loopStartBlock,
      loopEndBlock: timelineSettings.loopEndBlock,
      beatTop: timelineSettings.beatTop,
      beatBottom: timelineSettings.beatBottom,
      pickupEnabled: timelineSettings.pickupEnabled,
      pickupBeats: timelineSettings.pickupBeats,
      zoomPxPerBlock: timelineSettings.zoomPxPerBlock,
      timelineLengthBlocks: timelineSettings.timelineLengthBlocks,
      selectedColor: timelineSettings.selectedColor,
    },
    notes: notes.activeNotes,
    handPositions: handPositions.handPositions,
  }
}

function applySnapshot(snap) {
  if (!snap) return

  if (snap?.instrument?.instrumentType) instrument.setInstrumentType(snap.instrument.instrumentType)
  if (snap?.instrument?.tuningId) instrument.setTuningId(snap.instrument.tuningId)

  if (snap?.transport?.tempo != null) transport.setTempo(snap.transport.tempo)

  const s = snap?.timelineSettings
  if (s) {
    if (s.selectedMode) timelineSettings.setSelectedMode(s.selectedMode)
    if (s.snapEnabled != null) timelineSettings.setSnapEnabled(s.snapEnabled)
    if (s.soundPreviewEnabled != null)
      timelineSettings.setSoundPreviewEnabled(s.soundPreviewEnabled)
    if (s.clickEnabled != null) timelineSettings.setClickEnabled(s.clickEnabled)
    if (s.countInEnabled != null) timelineSettings.setCountInEnabled(s.countInEnabled)
    if (s.loopEnabled != null) timelineSettings.setLoopEnabled(s.loopEnabled)
    if (s.loopStartBlock != null) timelineSettings.setLoopStartBlock(s.loopStartBlock)
    if (s.loopEndBlock != null) timelineSettings.setLoopEndBlock(s.loopEndBlock)
    if (s.beatTop != null) timelineSettings.setBeatTop(s.beatTop)
    if (s.beatBottom != null) timelineSettings.setBeatBottom(s.beatBottom)
    if (s.pickupEnabled != null) timelineSettings.setPickupEnabled(s.pickupEnabled)
    if (s.pickupBeats != null) timelineSettings.setPickupBeats(s.pickupBeats)
    if (s.zoomPxPerBlock != null) timelineSettings.setZoomPxPerBlock(s.zoomPxPerBlock)
    if (s.timelineLengthBlocks != null)
      timelineSettings.setTimelineLengthBlocks(s.timelineLengthBlocks)
    if (s.selectedColor) timelineSettings.setSelectedColor(s.selectedColor)
  }

  if (Array.isArray(snap?.notes)) notes.setNotes(snap.notes)
  else notes.setNotes([])

  if (Array.isArray(snap?.handPositions)) handPositions.setHandPositions(snap.handPositions)
  else handPositions.setHandPositions([])
}

const canSaveAsNew = computed(() => {
  if (!isSupabaseConfigured) return false
  if (!auth.isSignedIn) return false
  if (!hasNotes.value) return false
  return true
})

const canReset = computed(() => {
  if (!library.currentItemContent) return false
  return true
})

function openSaveAsNew() {
  const base = String(library.currentItem?.title ?? '').trim()
  saveAsNewTitle.value = base ? `${base} (copy)` : t('app.newRecording')
  saveAsNewVisibility.value = 'private'
  saveAsNewOpen.value = true
}

function onNewRecording(kind = 'song') {
  const nextKind = String(kind) === 'exercise' ? 'exercise' : 'song'
  draftKind.value = nextKind
  saveError.value = ''
  library.clearCurrentItem()
  notes.setNotes([])
  handPositions.setHandPositions([])
  transport.setPlayheadMs(0)
  timelineSettings.setLoopEnabled(false)
  timelineSettings.setLoopStartBlock(0)
  timelineSettings.setLoopEndBlock(0)
}

async function onSaveAsNewConfirm() {
  if (!canSaveAsNew.value || saveAsNewBusy.value) return

  const title = String(saveAsNewTitle.value ?? '').trim()
  if (!title) return

  saveError.value = ''
  saveAsNewBusy.value = true
  try {
    const base = library.currentItem
    const kind = String(base?.kind ?? draftKind.value ?? 'song')
    const category = base?.category ? String(base.category) : ''
    const created = await library.createItem({
      kind,
      title,
      visibility: String(saveAsNewVisibility.value ?? 'private'),
      category,
      content: makeSnapshot(),
    })

    if (!created) {
      saveError.value = String(
        library.error?.message ?? library.error ?? t('app.saveFailed'),
      )
      return
    }

    saveAsNewOpen.value = false
  } finally {
    saveAsNewBusy.value = false
  }
}

function onResetChanges() {
  if (!canReset.value) return
  const ok = window.confirm(
    t('app.discardConfirm'),
  )
  if (!ok) return
  saveError.value = ''
  applySnapshot(library.currentItemContent)
}

async function onSaveCloud() {
  if (!canSave.value || saveBusy.value) return

  saveError.value = ''
  saveBusy.value = true
  try {
    const updated = await library.updateCurrentItemContent(makeSnapshot())
    if (!updated) {
      saveError.value = String(
        library.error?.message ?? library.error ?? t('app.saveFailed'),
      )
    }
  } finally {
    saveBusy.value = false
  }
}

function exportBaseFileName() {
  const title = String(library.currentItem?.title ?? 'guitarjemp_export').trim()
  const safe = title.replaceAll(/[^a-zA-Z0-9_-]+/g, '_').replaceAll(/^_+|_+$/g, '')
  return safe || 'guitarjemp_export'
}

function buildClipForExchange() {
  return buildExchangeClip({
    notes: notes.activeNotes,
    instrument,
    transport,
    settings: timelineSettings,
  })
}

function onExportMusicXml() {
  const clip = buildClipForExchange()
  const xml = toMusicXml(clip, { title: library.currentItem?.title || 'GuitarJemp Export' })
  downloadTextFile(`${exportBaseFileName()}.musicxml`, xml, 'application/vnd.recordare.musicxml+xml')
}

function onExportMidi() {
  const clip = buildClipForExchange()
  const midi = toMidiBytes(clip)
  downloadBinaryFile(`${exportBaseFileName()}.mid`, midi, 'audio/midi')
}

function onExportPdf() {
  const clip = buildClipForExchange()
  const pdf = toPdfBytes(clip, { title: library.currentItem?.title || 'GuitarJemp Export' })
  downloadBinaryFile(`${exportBaseFileName()}.pdf`, pdf, 'application/pdf')
}

function openImportPicker(mode = 'replace') {
  importMode.value = mode === 'append' ? 'append' : 'replace'
  importFileInput.value?.click?.()
}

function maxNoteEndBlock(noteList) {
  let maxEnd = 1
  for (const note of noteList ?? []) {
    const start = Number(note?.gridIndex)
    const length = Number(note?.lengthBlocks)
    const safeStart = Number.isFinite(start) && start > 0 ? start : 1
    const safeLength = Number.isFinite(length) && length > 0 ? length : 1
    const end = safeStart + safeLength
    if (end > maxEnd) maxEnd = end
  }
  return maxEnd
}

function applyImportedClip(clip, mode = 'replace') {
  if (!clip || !Array.isArray(clip.notes)) throw new Error(t('app.importNoNotes'))
  const importNotes = clip.notes
  const appendMode = mode === 'append'

  if (!appendMode || (notes.activeNotes?.length ?? 0) === 0) {
    transport.setTempo(clip.tempo)
    timelineSettings.setBeatTop(clip.beatTop)
    timelineSettings.setBeatBottom(clip.beatBottom)
  }

  if (!appendMode) {
    notes.setNotes(importNotes)
    return
  }

  const existing = notes.activeNotes ?? []
  if (!existing.length) {
    notes.setNotes(importNotes)
    return
  }

  let minStart = Number.POSITIVE_INFINITY
  for (const note of importNotes) {
    const start = Number(note?.gridIndex)
    if (Number.isFinite(start) && start > 0 && start < minStart) minStart = start
  }
  if (!Number.isFinite(minStart)) minStart = 1

  const targetStart = maxNoteEndBlock(existing)
  const delta = targetStart - minStart
  const shifted = importNotes.map((note) => ({
    ...note,
    gridIndex: Number((Number(note?.gridIndex ?? 1) + delta).toFixed(4)),
  }))
  notes.addNotes(shifted, { tag: 'importAppend' })
}

function showImportError(err, fileName = '') {
  const message = String(err?.message || err || t('app.importFailed'))
  const details = String(err?.stack || err?.cause || '')
  importErrorTitle.value = fileName ? `${message}\n${t('app.fileLabel')}: ${fileName}` : message
  importErrorDetails.value = details
  importErrorOpen.value = true
}

async function onImportFileChange(e) {
  const inputEl = e?.target
  const file = inputEl?.files?.[0]
  if (!file) return

  try {
    saveError.value = ''
    const lower = String(file.name || '').toLowerCase()
    const tuning = getTuning(instrument.tuningId)
    const openMidi = tuning?.openMidi || []
    const maxFret = Math.max(1, Number(numFrets.value) || 12)

    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      const ab = await file.arrayBuffer()
      const clip = parseMidiToClip(ab, { openMidi, maxFret })
      applyImportedClip(clip, importMode.value)
      return
    }

    const text = await file.text()
    const clip = parseMusicXmlToClip(text, { openMidi, maxFret })
    applyImportedClip(clip, importMode.value)
  } catch (err) {
    showImportError(err, file?.name)
  } finally {
    if (inputEl) inputEl.value = ''
  }
}

function triggerUndo() {
  externalUndoTick.value += 1
}

function triggerRedo() {
  externalRedoTick.value += 1
}

function resolveFretboardCardElement() {
  const fromRef = fretboardCardEl.value?.$el || fretboardCardEl.value
  if (fromRef instanceof HTMLElement) return fromRef
  if (typeof document === 'undefined') return null
  return document.querySelector('.fretboard-card')
}

function updateFretboardCardHeight() {
  const el = resolveFretboardCardElement()
  const rect = el?.getBoundingClientRect?.()
  const h = Number(rect?.height) || 0
  fretboardCardHeightPx.value = Math.max(0, Math.round(h))
}

function setupFretboardCardObserver() {
  const el = resolveFretboardCardElement()
  if (!el || typeof ResizeObserver === 'undefined') return
  if (fretboardCardResizeObserver) fretboardCardResizeObserver.disconnect()
  fretboardCardResizeObserver = new ResizeObserver(() => updateFretboardCardHeight())
  fretboardCardResizeObserver.observe(el)
  updateFretboardCardHeight()
}

const appShellStyle = computed(() => ({
  '--fretboard-card-h': `${fretboardVisible.value ? fretboardCardHeightPx.value : 0}px`,
}))

onMounted(async () => {
  await nextTick()
  setupFretboardCardObserver()
  updateFretboardCardHeight()
  requestAnimationFrame(() => {
    updateFretboardCardHeight()
  })
  onWindowResize = () => updateFretboardCardHeight()
  window.addEventListener('resize', onWindowResize, { passive: true })
  const storedTopPanelMode = localStorage.getItem(TOP_PANEL_MODE_STORAGE_KEY)
  if (storedTopPanelMode) topPanelMode.value = normalizeTopPanelMode(storedTopPanelMode)
})

onBeforeUnmount(() => {
  fretboardCardResizeObserver?.disconnect?.()
  fretboardCardResizeObserver = null
  if (onWindowResize) window.removeEventListener('resize', onWindowResize)
  onWindowResize = null
})

watch(
  () => fretboardVisible.value,
  async () => {
    await nextTick()
    setupFretboardCardObserver()
    updateFretboardCardHeight()
  },
)
</script>

<template>
  <v-app>
    <AuthDialog v-model="authOpen" />
    <ConnectionsDialog v-model="connectionsOpen" />

    <v-layout>
      <v-app-bar class="app-bar-sticky app-topbar" density="compact" elevation="0">
        <v-toolbar-title>GuitarJemp</v-toolbar-title>

        <v-spacer />

        <div class="d-flex flex-wrap align-center ga-2">
          <input ref="importFileInput" type="file" accept=".musicxml,.xml,.mid,.midi"
            style="display: none" @change="onImportFileChange" />

          <v-chip v-if="!isSupabaseConfigured" size="small" color="warning" variant="tonal">
            {{ t('app.cloudNotConfigured') }}
          </v-chip>
          <v-chip v-else-if="auth.isSignedIn" size="small" color="success" variant="tonal">
            {{ auth.profile?.display_name || auth.user?.user_metadata?.display_name || 'User' }}
          </v-chip>

          <v-menu location="bottom end">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" size="small" variant="tonal" prepend-icon="mdi-account">
                {{ t('app.account') }}
              </v-btn>
            </template>

            <v-list density="compact" min-width="180">
              <v-list-item
                :prepend-icon="auth.isSignedIn ? 'mdi-logout' : 'mdi-login'"
                :title="auth.isSignedIn ? t('app.logout') : t('app.login')"
                @click="auth.isSignedIn ? auth.signOut() : (authOpen = true)"
              />
              <v-list-item
                prepend-icon="mdi-account-multiple"
                :title="t('app.friends')"
                :disabled="!auth.isSignedIn"
                @click="connectionsOpen = true"
              />
            </v-list>
          </v-menu>
        </div>
      </v-app-bar>
      <div class="app-menu-bar">
        <v-menu location="bottom start">
          <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">
              {{ t('menu.file') }}
              </v-btn>
          </template>

          <v-list density="compact" min-width="220">
            <v-list-item prepend-icon="mdi-file-plus-outline"
              title="New"
              @click="onNewRecording('song')" />
            <v-divider class="my-1" />
            <v-list-item prepend-icon="mdi-content-save" :title="t('app.save')" :disabled="!canSave || saveBusy"
              @click="onSaveCloud" />
            <v-list-item prepend-icon="mdi-content-save-plus" :title="t('app.saveAsNew')" :disabled="!canSaveAsNew"
              @click="openSaveAsNew" />
            <v-list-item prepend-icon="mdi-restore" :title="t('app.reset')" :disabled="!canReset" @click="onResetChanges" />
            <v-divider class="my-1" />
            <v-list-item prepend-icon="mdi-file-music-outline" :title="t('app.exportMusicXml')" :disabled="!hasNotes"
              @click="onExportMusicXml" />
            <v-list-item prepend-icon="mdi-file-music" :title="t('app.exportMidi')" :disabled="!hasNotes"
              @click="onExportMidi" />
            <v-list-item prepend-icon="mdi-file-pdf-box" :title="t('app.exportPdf')" :disabled="!hasNotes"
              @click="onExportPdf" />
            <v-divider class="my-1" />
            <v-list-item prepend-icon="mdi-file-replace-outline" :title="t('app.importReplace')"
              @click="openImportPicker('replace')" />
            <v-list-item prepend-icon="mdi-file-plus-outline" :title="t('app.importAppend')"
              @click="openImportPicker('append')" />
          </v-list>
        </v-menu>
        <v-menu location="bottom start">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">
              {{ t('menu.edit') }}
            </v-btn>
          </template>
          <v-list density="compact" min-width="180">
            <v-list-item prepend-icon="mdi-undo" :title="t('modeSelector.undo')" @click="triggerUndo" />
            <v-list-item prepend-icon="mdi-redo" :title="t('modeSelector.redo')" @click="triggerRedo" />
            <v-divider class="my-1" />
            <v-list-item prepend-icon="mdi-cog-outline" title="Preferences" @click="preferencesOpen = true" />
          </v-list>
        </v-menu>
        <v-btn variant="text" size="small" class="app-menu-btn">{{ t('menu.view') }}</v-btn>
        <v-menu location="bottom start" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">
              {{ t('menu.window') }}
            </v-btn>
          </template>
          <v-card class="pa-3 d-flex flex-column ga-2" min-width="300">
            <v-switch density="compact" hide-details inset :label="t('modeSelector.fretboard')" :model-value="fretboardVisible"
              @update:model-value="(v) => (fretboardVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('modeSelector.timeline')" :model-value="timelineVisible"
              @update:model-value="(v) => (timelineVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('timelineView.transport')" :model-value="transportVisible"
              @update:model-value="(v) => (transportVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('libraryDialog.title')" :model-value="libraryPanelVisible"
              @update:model-value="(v) => (libraryPanelVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('modeSelector.activeNotes')" :model-value="activeNotesVisible"
              @update:model-value="(v) => (activeNotesVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('modeSelector.chordMenu')" :model-value="chordMenuVisible"
              @update:model-value="(v) => (chordMenuVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('modeSelector.scaleMenu')" :model-value="scaleMenuVisible"
              @update:model-value="(v) => (scaleMenuVisible = Boolean(v))" />
            <v-switch density="compact" hide-details inset :label="t('modeSelector.chordShapePanel')" :model-value="timelineSettings.showChordShapePanel"
              @update:model-value="(v) => timelineSettings.setShowChordShapePanel(Boolean(v))" />
          </v-card>
        </v-menu>
        <v-menu location="bottom start">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn">
              {{ t('menu.language') }}
            </v-btn>
          </template>
          <v-list density="compact" min-width="180">
            <v-list-item
              v-for="lang in languages"
              :key="lang.code"
              :title="lang.label"
              :prepend-icon="locale === lang.code ? 'mdi-check' : undefined"
              @click="setLocale(lang.code)"
            />
          </v-list>
        </v-menu>
        <v-btn variant="text" size="small" class="app-menu-btn">{{ t('menu.help') }}</v-btn>
      </div>

      <LibraryDialog v-model="libraryOpen" />

      <v-main class="app-main-with-menubar">
        <div class="app-shell" :style="appShellStyle">
          <TopPanelModeRail :model-value="topPanelMode" @update:model-value="setTopPanelMode" />
          <div class="app-content with-main-menu py-3">
            <v-alert v-if="saveError" type="error" variant="tonal" class="mb-2">
              {{ saveError }}
            </v-alert>

            <v-card ref="fretboardCardEl" v-if="fretboardVisible" class="fretboard-card ui-panel pa-2" variant="flat">
              <div class="fretboard-card-layout">
                <FretboardRail
                  title="Toolbox"
                  rail-class="fretboard-card-rail-left"
                  host-id="fretboard-left-rail-host"
                  host-class="fretboard-left-rail-host"
                />
                <div class="fretboard-card-center">
                  <div class="fretboard-inner">
                    <Fretboard class="fretboard" :num-frets="numFrets" :editable="true"
                      @update-frets="(n) => (numFrets = n)" />
                  </div>
                  <div id="fretboard-transport-host" class="fretboard-transport-host" />
                </div>
                <FretboardRail
                  title="Organize"
                  rail-class="fretboard-card-rail-right"
                  host-id="fretboard-right-rail-host"
                  host-class="fretboard-right-rail-host"
                />
              </div>
            </v-card>

            <v-card class="top-panel-card ui-panel" variant="flat">
              <Timeline
                v-show="topPanelMode === 'timeline'"
                class="top-panel-timeline"
                :compact="false"
                :num-frets="numFrets"
                :library-enabled="auth.isSignedIn"
                :active-notes-visible="activeNotesVisible"
                :fretboard-visible="fretboardVisible"
                :chord-menu-visible="chordMenuVisible"
                :timeline-visible="timelineVisible"
                :transport-visible="transportVisible"
                :library-panel-visible="libraryPanelVisible"
                :external-undo-tick="externalUndoTick"
                :external-redo-tick="externalRedoTick"
                :is-dark-theme="isDarkTheme"
                @open-library="libraryOpen = true"
                @toggle-theme="toggleTheme"
                @update-active-notes-visible="(v) => (activeNotesVisible = Boolean(v))"
                @update-fretboard-visible="(v) => (fretboardVisible = Boolean(v))"
                @update-chord-menu-visible="(v) => (chordMenuVisible = Boolean(v))"
                @update-timeline-visible="(v) => (timelineVisible = Boolean(v))"
                @update-transport-visible="(v) => (transportVisible = Boolean(v))"
                @update-library-panel-visible="(v) => (libraryPanelVisible = Boolean(v))"
                @update-frets="(n) => (numFrets = n)"
              />
              <div v-if="topPanelMode === 'library'" class="top-panel-library pa-2">
                <LibraryPanel />
              </div>
              <SharePanel
                v-if="topPanelMode === 'share'"
                v-model="shareEmail"
                :has-notes="hasNotes"
                @export-musicxml="onExportMusicXml"
                @export-midi="onExportMidi"
                @export-pdf="onExportPdf"
              />
            </v-card>
            <ChordMenu v-if="topPanelMode === 'timeline' && chordMenuVisible" class="mt-3" />
            <ScaleMenu v-if="topPanelMode === 'timeline' && scaleMenuVisible" class="mt-3" />

            <div v-if="topPanelMode === 'timeline' && activeNotesVisible" class="d-none d-md-flex active-tones-col">
                <ActiveTonesWindow class="active-tones integrated-active-tones" />
            </div>
          </div>
        </div>
      </v-main>

      <v-dialog v-model="saveAsNewOpen" max-width="520">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>{{ t('app.saveAsNew') }}</span>
            <v-btn icon="mdi-close" variant="text" @click="saveAsNewOpen = false" />
          </v-card-title>

          <v-card-text>
            <v-text-field v-model="saveAsNewTitle" :label="t('app.title')" density="compact" variant="outlined"
              autofocus />

            <v-select v-model="saveAsNewVisibility" :items="[
              { title: t('app.private'), value: 'private' },
              { title: t('app.connections'), value: 'connections' },
              { title: t('app.public'), value: 'public' },
            ]" :label="t('app.visibility')" density="compact" variant="outlined" />
          </v-card-text>

          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="saveAsNewOpen = false">{{ t('app.cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" :disabled="!canSaveAsNew || !String(saveAsNewTitle ?? '').trim() || saveAsNewBusy
              " @click="onSaveAsNewConfirm">
              {{ t('app.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="importErrorOpen" max-width="700">
        <v-card rounded="lg">
          <v-card-title class="d-flex align-center justify-space-between">
            <span>{{ t('app.importFailed') }}</span>
            <v-btn icon="mdi-close" variant="text" @click="importErrorOpen = false" />
          </v-card-title>
          <v-card-text>
            <p class="mb-2">{{ importErrorTitle }}</p>
            <v-sheet v-if="importErrorDetails" rounded="md" class="import-error-sheet pa-3">
              <pre class="import-error-details">{{ importErrorDetails }}</pre>
            </v-sheet>
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="importErrorOpen = false">{{ t('app.close') }}</v-btn>
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
              :label="t('modeSelector.toneDuration')"
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
              :label="t('modeSelector.sound')"
            />
            <v-switch
              v-model="preferenceDarkMode"
              density="compact"
              hide-details
              inset
              :label="t('modeSelector.dark')"
            />
            <v-switch
              density="compact"
              hide-details
              inset
              :label="t('timelineView.handPosition')"
              :model-value="timelineSettings.handPositionVisible"
              @update:model-value="(v) => timelineSettings.setHandPositionVisible(Boolean(v))"
            />
          </v-card-text>
          <v-card-actions class="justify-end">
            <v-btn variant="text" @click="preferencesOpen = false">{{ t('app.close') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-layout>
  </v-app>
</template>

<style scoped>
.app-bar-sticky {
  position: fixed !important;
  top: 0 !important;
  left: 0;
  right: 0;
  z-index: 1000;
}

.app-topbar {
  background: color-mix(in srgb, var(--color-surface) 84%, transparent) !important;
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
}

.app-topbar :deep(.v-toolbar-title) {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-primary-2);
}

.app-menu-bar {
  position: fixed;
  top: 48px;
  left: 0;
  right: 0;
  z-index: 999;
  height: 30px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 10px;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  backdrop-filter: blur(8px);
}

.app-menu-btn {
  min-width: auto;
  height: 24px;
  padding-inline: 8px;
  font-size: 0.74rem;
  text-transform: none;
  letter-spacing: 0.01em;
}

.app-main-with-menubar {
  padding-top: 78px;
}

.app-shell {
  --main-menu-w: 84px;
  --fixed-transport-h: 96px;
  --fixed-stack-gap: 8px;
  --fixed-panel-left: 0px;
  --fixed-panel-right: 0px;
  --timeline-rail-w: 148px;
  --timeline-rail-gap: 8px;
  --fretboard-inner-max-w: calc(1280px - (2 * (var(--main-menu-w) + var(--space-4))));
  min-height: 100vh;
  background:
    radial-gradient(1200px 500px at 10% -5%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 60%),
    radial-gradient(1100px 450px at 90% 0%, color-mix(in srgb, var(--color-primary-2) 16%, transparent), transparent 62%),
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%) 0%, var(--color-surface-2) 100%);
  font-family: var(--font-ui);
}

.app-content {
  max-width: 1280px;
  margin: 0 auto;
  padding-bottom: calc(340px + var(--fixed-transport-h) + var(--fixed-stack-gap));
}

.app-content.with-main-menu {
  padding-left: calc(var(--main-menu-w) + var(--space-4));
  padding-right: calc(var(--main-menu-w) + var(--space-4));
}

.fretboard-card {
  --fretboard-rail-w: 88px;
  --panel-side-col-w: 36px;
  --panel-side-gap: 6px;
  position: fixed;
  left: var(--fixed-panel-left);
  right: var(--fixed-panel-right);
  bottom: 0;
  height: calc((100vh - 78px) / 2);
  width: auto;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
  z-index: 30;
}

.fretboard-card-layout {
  display: grid;
  grid-template-columns: var(--fretboard-rail-w) minmax(0, 1fr) var(--fretboard-rail-w);
  align-items: stretch;
  width: 100%;
  min-width: 0;
}

.fretboard-card-center {
  min-width: 0;
}

.fretboard-card-rail {
  display: flex;
  flex-direction: column;
  background: color-mix(in srgb, var(--color-surface-2) 74%, transparent);
  border-left: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
}

.fretboard-rail-title {
  padding: 8px 8px 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  text-align: center;
}

.fretboard-left-rail-host {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.fretboard-right-rail-host {
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.fretboard-inner {
  width: 100%;
  max-width: var(--fretboard-inner-max-w);
  margin: 0 auto;
  padding-top: 26px;
}

.fretboard {
  width: 100%;
  margin-top: 0;
  margin-right: 0;
  border-radius: var(--radius-lg);
  overflow: visible;
}

.fretboard-transport-host {
  width: 100%;
  max-width: var(--fretboard-inner-max-w);
  margin: 2px auto 0;
  position: relative;
  z-index: 1;
}

.top-panel-timeline,
.active-tones {
  border-radius: 0;
  overflow: clip;
}

.top-panel-timeline {
  --panel-side-col-w: 36px;
  --panel-side-gap: 6px;
  width: 100%;
  height: 100%;
}

.top-panel-card {
  position: fixed;
  left: calc(var(--fixed-panel-left) + var(--timeline-rail-w) + var(--timeline-rail-gap));
  right: var(--fixed-panel-right);
  top: 78px;
  height: calc((100vh - 78px) / 2);
  overflow: hidden;
  z-index: 31;
}

.top-panel-library {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.active-tones-col {
  display: flex;
}

.integrated-active-tones {
  width: 100%;
  max-width: none;
  height: 100%;
}

.import-error-sheet {
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-2) 70%, transparent);
}

.import-error-details {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.78rem;
  line-height: 1.35;
}

@media (max-width: 860px) {
  .app-shell {
    --fixed-panel-left: var(--space-2);
    --fixed-panel-right: var(--space-2);
    --timeline-rail-w: 124px;
    --timeline-rail-gap: 6px;
  }

  .app-content.with-main-menu {
    padding-left: 0;
    padding-right: 0;
  }

  .app-content {
    padding-bottom: calc(320px + var(--fixed-transport-h) + var(--fixed-stack-gap));
  }

  .fretboard-card {
    --fretboard-rail-w: 56px;
    left: var(--fixed-panel-left);
    right: var(--fixed-panel-right);
    bottom: 0;
  }

  .top-panel-card {
    left: calc(var(--fixed-panel-left) + var(--timeline-rail-w) + var(--timeline-rail-gap));
    right: var(--fixed-panel-right);
  }
}
</style>
