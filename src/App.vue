<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import LayoutManager from '@/components/app/LayoutManager.vue'
import Fretboard from '@/features/fretboard'
import Timeline from '@/features/timeline'
import { TransportBar } from '@/features/transport'
import FretboardContextMenu from '@/features/fretboard/components/FretboardContextMenu.vue'
import ColorPalette from '@/features/fretboard/components/ColorPalette.vue'
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
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'
import { SURFACE_MODES, useUiModeStore } from '@/store/useUiMode'
import { buildSongSnapshot } from '@/domain/song/songSnapshot'
import { buildExchangeClip } from '@/domain/exchange/clipExchange'
import { toMusicXml } from '@/domain/exchange/musicxml'
import { toMidiBytes } from '@/domain/exchange/midi'
import { toPdfBytes } from '@/domain/exchange/pdf'
import { NOTE_VALUE_ITEMS, normalizeNoteValue, noteValueFallbackSymbol } from '@/config/noteValues'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { planImportedFretboardLayout } from '@/domain/exchange/importFretboardLayout'
import { getTuning } from '@/domain/music/tunings'
import { createNoteKey } from '@/domain/note'
import { defaultLengthBlocksForMode, nextGridIndexFromNotes } from '@/domain/timelinePlacement'
import { snapStepBlocksForMode } from '@/domain/timelineInteractions'
import { downloadBinaryFile, downloadTextFile } from '@/infra/files/download'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import { DEFAULT_TIME_PER_BLOCK_MS, TIMELINE_SNAP_STEP_BLOCKS } from '@/features/timeline/config/grid'
import { initAudioEngine, installAudioAutoWarmup } from '@/domain/audio/simpleSynth'
import { useI18n } from '@/i18n'
import { useTheme } from 'vuetify'

const numFrets = ref(12)
const corePadResizePx = ref(0)
const fretboardMainEl = ref(null)
const timelineRef = ref(null)
const importFilesInputEl = ref(null)
const timelineUndoTick = ref(0)
const timelineRedoTick = ref(0)
const transportVisible = ref(true)
const showFretboard = ref(true)
const showTimeline = ref(true)
const showTransportBar = ref(true)
const workspacePanelTab = ref('timeline')
const sidebarTab = ref('shapes')
const sidebarVisible = ref(true)
const mainView = ref('workspace')
const dashboardPanel = ref('library')
const viewMode = ref('desktop')
const phonePane = ref('fretboard')
const isPortraitViewport = ref(false)
const viewportHeightUnitPx = ref(1)
const debugViewportOpen = ref(false)
const debugViewportPreset = ref('off')
const debugViewportWidthPx = ref(null)
const debugViewportHeightPx = ref(null)
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
const newSongPickupBeats = ref(0)
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
const DOT_GROUP_NAMES_STORAGE_KEY = 'guitarjemp.dotGroupNames.v1'
const THEME_STORAGE_KEY = 'guitarjemp.ui.theme'
const APP_VERSION_LABEL = 'v.1.2'
const dotGroupNames = ref(readStoredDotGroupNames())
const dotGroupMenu = ref({
  open: false,
  x: 0,
  y: 0,
  color: '',
})

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
const fretboardOverlay = useFretboardOverlayStore()
const uiMode = useUiModeStore()
const theme = useTheme()
const { locale, languages, setLocale, t } = useI18n()
const leftRailNoteValue = computed({
  get: () =>
    timelineSettings.selectedMode === 'sim'
      ? String(timelineSettings.lastRhythmMode || '1/4')
      : String(timelineSettings.selectedMode || '1/4'),
  set: (value) => {
    timelineSettings.setSelectedMode(String(value || '1/4'))
  },
})
const leftRailNoteItems = computed(() =>
  NOTE_VALUE_ITEMS.map((item) => ({
    ...item,
    title: t(`noteValues.${item.value.replace('/', '_')}`, item.title),
    glyph: noteValueFallbackSymbol(item.value),
  })),
)
const leftRailModifier = computed({
  get: () => String(timelineSettings.simGroupMode || ''),
  set: (value) => timelineSettings.setSimGroupMode(String(value || '')),
})
const leftRailChordEnabled = computed(() => timelineSettings.selectedMode === 'sim')
const leftRailClearCount = computed(() =>
  Array.isArray(notes.activeNotes) ? notes.activeNotes.length : 0,
)
const SONG_KEY_OPTIONS = [
  { title: 'C', value: 'C' },
  { title: 'C#/Db', value: 'C#' },
  { title: 'D', value: 'D' },
  { title: 'D#/Eb', value: 'D#' },
  { title: 'E', value: 'E' },
  { title: 'F', value: 'F' },
  { title: 'F#/Gb', value: 'F#' },
  { title: 'G', value: 'G' },
  { title: 'G#/Ab', value: 'G#' },
  { title: 'A', value: 'A' },
  { title: 'A#/Bb', value: 'A#' },
  { title: 'B', value: 'B' },
]
const CHORD_TYPE_OPTIONS = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  'dominant 7',
  'major 7',
  'minor 7',
  'half-diminished 7',
  'diminished 7',
  'add9',
  'major 6',
  'minor 6',
]
const DOT_LABEL_MODE_OPTIONS = [
  { title: 'Rhythm', value: 'rhythm' },
  { title: 'Intervals', value: 'intervals' },
  { title: 'Play Order', value: 'play-order' },
  { title: 'Fingering', value: 'fingering' },
]
const PLAY_ORDER_SCOPE_OPTIONS = [
  { title: 'Per Song', value: 'song' },
  { title: 'Per Dotgroup', value: 'dotgroup' },
]
const SCALE_TYPE_OPTIONS = [
  'major (ionian)',
  'natural minor (aeolian)',
  'harmonic minor',
  'melodic minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'major pentatonic',
  'minor pentatonic',
  'blues',
  'chromatic',
  'whole tone',
  'diminished (whole-half)',
]
const SCALE_POSITION_OPTIONS = ['Open', '3', '5', '7', '9', '12']
const SCALE_PATTERN_OPTIONS = [
  'CAGED 1',
  'CAGED 2',
  'CAGED 3',
  'CAGED 4',
  'CAGED 5',
  '3 Notes Per String',
  'Box Pattern 1',
  'Box Pattern 2',
  'Box Pattern 3',
]

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
  set: (v) => applyTheme(v ? 'guitarjempDark' : 'guitarjemp'),
})
const preferenceIntervalsOnDots = computed({
  get: () => Boolean(timelineSettings.showIntervalsOnDots),
  set: (v) => timelineSettings.setShowIntervalsOnDots(Boolean(v)),
})
const fretboardDotLabelMode = computed({
  get: () => String(timelineSettings.dotLabelMode || 'rhythm'),
  set: (v) => timelineSettings.setDotLabelMode(String(v || 'rhythm')),
})
const fretboardPlayOrderScope = computed({
  get: () => String(timelineSettings.playOrderScope || 'song'),
  set: (v) => timelineSettings.setPlayOrderScope(String(v || 'song')),
})
const usedDotGroups = computed(() => {
  const items = Array.isArray(notes.activeNotes) ? [...notes.activeNotes] : []
  items.sort((a, b) => {
    const ga = Number(a?.gridIndex) || 0
    const gb = Number(b?.gridIndex) || 0
    if (ga !== gb) return ga - gb
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return ta - tb
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })

  const seen = new Set()
  const out = []
  for (const note of items) {
    const color = String(note?.color || '').trim()
    if (!color || seen.has(color)) continue
    seen.add(color)
    const customLabel = String(dotGroupNames.value?.[color] || '').trim()
    out.push({
      id: `dot-group-${out.length + 1}`,
      color,
      label: customLabel || `#${out.length + 1}`,
      defaultLabel: `#${out.length + 1}`,
    })
  }
  return out
})
const allDotGroupsSelected = computed(
  () => !String(timelineSettings.activeDotGroupColor || '').trim(),
)
const hasDotGroups = computed(() => usedDotGroups.value.length > 0)
const preferenceLeftHanded = computed({
  get: () => Boolean(timelineSettings.leftHanded),
  set: (v) => timelineSettings.setLeftHanded(Boolean(v)),
})

function readStoredDotGroupNames() {
  try {
    const raw = localStorage.getItem(DOT_GROUP_NAMES_STORAGE_KEY)
    const parsed = JSON.parse(String(raw || '{}'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistDotGroupNames() {
  try {
    localStorage.setItem(DOT_GROUP_NAMES_STORAGE_KEY, JSON.stringify(dotGroupNames.value || {}))
  } catch {
    // ignore persistence errors
  }
}

function openDotGroupMenu(event, group) {
  event?.preventDefault?.()
  dotGroupMenu.value = {
    open: true,
    x: Number(event?.clientX) || 0,
    y: Number(event?.clientY) || 0,
    color: String(group?.color || ''),
  }
}

function closeDotGroupMenu() {
  dotGroupMenu.value = {
    open: false,
    x: 0,
    y: 0,
    color: '',
  }
}

function renameDotGroup() {
  const color = String(dotGroupMenu.value.color || '').trim()
  if (!color) return
  const group = usedDotGroups.value.find((item) => item.color === color)
  const current = String(dotGroupNames.value?.[color] || group?.defaultLabel || '').trim()
  const next = window.prompt('Tongroup umbenennen', current)
  if (next == null) {
    closeDotGroupMenu()
    return
  }
  const trimmed = String(next).trim()
  const updated = { ...(dotGroupNames.value || {}) }
  if (!trimmed || trimmed === String(group?.defaultLabel || '').trim()) delete updated[color]
  else updated[color] = trimmed
  dotGroupNames.value = updated
  persistDotGroupNames()
  closeDotGroupMenu()
}

function onWindowPointerDown(event) {
  if (!dotGroupMenu.value.open) return
  const target = event?.target
  if (target?.closest?.('.dot-group-context-menu')) return
  closeDotGroupMenu()
}

function activateAllDotGroups() {
  if (!hasDotGroups.value) return
  timelineSettings.setActiveDotGroupColor('')
}

function activateDotGroup(color) {
  const nextColor = String(color || '').trim()
  timelineSettings.setActiveDotGroupColor(nextColor)
  if (!nextColor) return
  const firstNote = (Array.isArray(notes.activeNotes) ? [...notes.activeNotes] : [])
    .filter((note) => String(note?.color || '').trim() === nextColor)
    .sort((a, b) => {
      const ga = Number(a?.gridIndex) || 0
      const gb = Number(b?.gridIndex) || 0
      if (ga !== gb) return ga - gb
      const ta = Number(a?.placedAtMs) || 0
      const tb = Number(b?.placedAtMs) || 0
      if (ta !== tb) return ta - tb
      return String(a?.key || '').localeCompare(String(b?.key || ''))
    })[0]
  const firstGridIndex = Number(firstNote?.gridIndex)
  if (Number.isFinite(firstGridIndex) && firstGridIndex > 0) {
    timelineRef.value?.seekToGridIndex?.(firstGridIndex)
  }
}
const languageItems = computed(() => languages.map((l) => ({ title: l.label, value: l.code })))
const preferenceLanguage = computed({
  get: () => String(locale.value || 'en'),
  set: (v) => {
    void setLocale(String(v || 'en'))
  },
})
const PHONE_VIEW_BREAKPOINT_PX = 860
const isDevMode = computed(() => Boolean(import.meta.env.DEV))
const VIEWPORT_DEBUG_PRESETS = [
  { key: 'off', label: 'Off', widthPx: null, heightPx: null },
  { key: 'iphone-se', label: 'iPhone SE (667x375)', widthPx: 667, heightPx: 375 },
  { key: 'iphone-14-pro', label: 'iPhone 14 Pro (852x393)', widthPx: 852, heightPx: 393 },
  { key: 'pixel-7', label: 'Pixel 7 (915x412)', widthPx: 915, heightPx: 412 },
  { key: 'galaxy-s20', label: 'Galaxy S20 (800x360)', widthPx: 800, heightPx: 360 },
]
const debugViewportFrameActive = computed(
  () => isDevMode.value && String(debugViewportPreset.value || 'off') !== 'off',
)
const effectiveViewportHeightPx = computed(() => {
  const debugHeight = Number(debugViewportHeightPx.value)
  if (Number.isFinite(debugHeight) && debugHeight > 0) return debugHeight
  return (Number(viewportHeightUnitPx.value) || 1) * 100
})
const effectiveViewportWidthPx = computed(() => {
  const debugWidth = Number(debugViewportWidthPx.value)
  if (Number.isFinite(debugWidth) && debugWidth > 0) return debugWidth
  if (typeof window === 'undefined') return 1280
  return Number(window.innerWidth) || 1280
})
const effectiveViewMode = computed(() => {
  if (debugViewportFrameActive.value) return 'phone'
  return String(viewMode.value || 'desktop')
})
const isPhoneView = computed(() => effectiveViewMode.value === 'phone')
const isWatchView = computed(() => effectiveViewMode.value === 'watch')
const isCompactView = computed(() => isPhoneView.value || isWatchView.value)
const isCommentMode = computed(() => uiMode.surfaceMode === SURFACE_MODES.COMMENT)
const effectiveIsPortrait = computed(() => {
  if (debugViewportFrameActive.value) {
    return Number(effectiveViewportHeightPx.value) > Number(effectiveViewportWidthPx.value)
  }
  return Boolean(isPortraitViewport.value)
})
const showPhoneRotateOverlay = computed(() => false)
const appLayoutStyle = computed(() => ({
  '--app-vh': debugViewportFrameActive.value
    ? `${Math.max(0.01, Number(effectiveViewportHeightPx.value) / 100 || 1)}px`
    : null,
  '--app-debug-width': debugViewportFrameActive.value
    ? `${Math.max(320, Number(effectiveViewportWidthPx.value) || 1280)}px`
    : null,
  '--app-safe-bottom': 'env(safe-area-inset-bottom, 0px)',
}))

function applyTheme(name) {
  const next = name === 'guitarjempDark' ? 'guitarjempDark' : 'guitarjemp'
  theme.global.name.value = next
  localStorage.setItem(THEME_STORAGE_KEY, next)
}

function updateViewportOrientationFlag() {
  if (typeof window === 'undefined') return
  isPortraitViewport.value = window.innerHeight > window.innerWidth
}

function updateViewportHeightUnit() {
  if (typeof window === 'undefined') return
  const vv = window.visualViewport
  const height = Number(vv?.height) || Number(window.innerHeight)
  if (!Number.isFinite(height) || height <= 0) return
  viewportHeightUnitPx.value = height / 100
}

function applyViewportDebugPreset(presetKey) {
  const key = String(presetKey || 'off')
  const preset = VIEWPORT_DEBUG_PRESETS.find((p) => p.key === key) || VIEWPORT_DEBUG_PRESETS[0]
  debugViewportPreset.value = preset.key
  debugViewportWidthPx.value = Number.isFinite(preset.widthPx) ? Number(preset.widthPx) : null
  debugViewportHeightPx.value = Number.isFinite(preset.heightPx) ? Number(preset.heightPx) : null
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
    fretboardOverlay,
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
  dashboardPanel.value = normalizeDashboardPanel(initialPanel)
  mainView.value = 'dashboard'

  // Load cloud data in background so dashboard opens instantly.
  if (!auth.isSignedIn) return
  try {
    await Promise.all([library.refresh(), connections.refresh()])
  } catch (err) {
    console.warn('Dashboard background refresh failed:', err)
  }
}

function closeDashboard() {
  mainView.value = 'workspace'
}

function selectDashboardPanel(panel) {
  dashboardPanel.value = normalizeDashboardPanel(panel)
}

function openShareManager() {
  void openDashboard('share')
}

function getShareUrl() {
  const fallback = 'https://saitenreisser1000.github.io/GuitarJemp/'
  if (typeof window === 'undefined') return fallback
  const href = String(window.location.href || '').trim()
  const host = String(window.location.hostname || '').toLowerCase()
  if (!href) return fallback
  if (host === 'localhost' || host === '127.0.0.1') return fallback
  return href
}

function normalizeWhatsappNumber(raw) {
  const source = String(raw || '').trim()
  if (!source) return ''
  const normalized = source.replace(/[\s\-().]/g, '')
  let digits = normalized

  if (digits.startsWith('+')) digits = digits.slice(1)
  else if (digits.startsWith('00')) digits = digits.slice(2)

  digits = digits.replace(/[^\d]/g, '')
  if (!digits) return ''

  // wa.me requires international format without leading + or local trunk "0".
  if (digits.startsWith('0')) return ''
  if (digits.length < 7) return ''
  return digits
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
  if (typeof window === 'undefined') return
  const opened = window.open(href, '_blank', 'noopener')
  if (!opened) window.location.assign(href)
}

function shareByWhatsApp(contact) {
  const number = normalizeWhatsappNumber(contact?.whatsapp)
  if (!number) {
    window.alert('Bitte WhatsApp-Nummer im internationalen Format eintragen (z. B. +43664...).')
    return
  }
  const text = encodeURIComponent(buildShareMessage(contact?.name))
  const hrefPrimary = `https://wa.me/${number}?text=${text}`
  const hrefFallback = `https://web.whatsapp.com/send?phone=${number}&text=${text}`
  if (typeof window === 'undefined') return
  const opened = window.open(hrefPrimary, '_blank', 'noopener')
  if (opened) return
  const openedFallback = window.open(hrefFallback, '_blank', 'noopener')
  if (!openedFallback) window.location.assign(hrefFallback)
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

function isMusicXmlFilename(name) {
  return /\.(musicxml|xml)$/i.test(String(name || '').trim())
}

function sortedImportFiles(fileList) {
  return [...(fileList ?? [])]
    .filter((file) => file instanceof File)
    .filter((file) => isMusicXmlFilename(file.name))
    .sort((a, b) => {
      const aPath = String(a.webkitRelativePath || a.name || '').toLowerCase()
      const bPath = String(b.webkitRelativePath || b.name || '').toLowerCase()
      return aPath.localeCompare(bPath)
    })
}

function importedClipEndBlock(clip) {
  let max = 0
  for (const note of clip?.notes ?? []) {
    const gridIndex = Number(note?.gridIndex)
    const lengthBlocks = Number(note?.lengthBlocks)
    if (!Number.isFinite(gridIndex) || !Number.isFinite(lengthBlocks)) continue
    max = Math.max(max, gridIndex - 1 + lengthBlocks)
  }
  return max
}

function buildImportedNotes(clips) {
  const merged = []

  for (const clip of clips) {
    for (const note of clip?.notes ?? []) {
      merged.push({
        ...note,
        key: createNoteKey(),
        gridIndex: Number(note.gridIndex),
        placedAtMs: Date.now(),
      })
    }
  }

  return merged
}

function applyImportedClipSettings(firstClip, mergedNotes, { handPositions: importedHandPositions = [], requiredNumFrets = 12 } = {}) {
  if (!firstClip) return

  songName.value = String(firstClip.title || songName.value || '').trim()
  transport.setTempo(firstClip.tempo)
  timelineSettings.setBeatTop(firstClip.beatTop)
  timelineSettings.setBeatBottom(firstClip.beatBottom)

  const importedEnd = importedClipEndBlock({ notes: mergedNotes })
  const nextTimelineLength = Math.max(Number(timelineSettings.timelineLengthBlocks) || 0, importedEnd)
  if (nextTimelineLength > 0) timelineSettings.setTimelineLengthBlocks(nextTimelineLength)

  if (requiredNumFrets > (Number(numFrets.value) || 0)) {
    numFrets.value = requiredNumFrets
  }

  handPositions.setHandPositions(importedHandPositions)
  fretboardOverlay.setTextItems([])
  selection.clearSelection()
  transport.setPlayState('stopped')
  transport.setPlayheadMs(0)
}

async function importMusicXmlFiles(fileList) {
  const files = sortedImportFiles(fileList)
  if (!files.length) return

  try {
    const tuning = getTuning(instrument.tuningId)
    const clips = []
    const importMaxFret = Math.max(36, Number(numFrets.value) || 0)
    for (const file of files) {
      const xmlText = await file.text()
      const clip = parseMusicXmlToClip(xmlText, {
        openMidi: tuning?.openMidi ?? [],
        maxFret: importMaxFret,
      })
      if (Array.isArray(clip?.notes) && clip.notes.length) clips.push(clip)
    }

    if (!clips.length) {
      window.alert(t('app.importNoNotes'))
      return
    }

    const mergedNotes = buildImportedNotes(clips)
    const layout = planImportedFretboardLayout(mergedNotes, {
      numFrets: Number(numFrets.value) || 12,
      openMidi: tuning?.openMidi ?? [],
    })
    notes.setNotes(layout.notes)

    applyImportedClipSettings(clips[0], layout.notes, layout)
  } catch (error) {
    const message = String(error?.message || error || t('app.importFailed'))
    window.alert(`${t('app.importFailed')} ${message}`.trim())
  }
}

function clearImportInputValue(inputEl) {
  if (!inputEl) return
  inputEl.value = ''
}

function openImportFiles() {
  clearImportInputValue(importFilesInputEl.value)
  importFilesInputEl.value?.click()
}

async function onImportFilesChange(event) {
  const input = event?.target
  await importMusicXmlFiles(input?.files)
  clearImportInputValue(input)
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
      fretboardOverlay,
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
  newSongPickupBeats.value = Math.max(0, Number(timelineSettings.pickupBeats) || 0)
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
  const pickupBeats = Math.max(0, Math.floor(Number(newSongPickupBeats.value) || 0))
  const pickupEnabled = Boolean(newSongPickupEnabled.value) && pickupBeats > 0
  const shuffleEnabled = Boolean(newSongShuffleEnabled.value)
  const key = String(newSongKey.value || 'C').toUpperCase()

  if (songDialogMode.value === 'new') {
    notes.clearNotes()
    selection.clearSelection()
    handPositions.setHandPositions([])
    fretboardOverlay.setTextItems([])
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

function clearFretboardFromLeftRail() {
  if (leftRailClearCount.value > 15) {
    const confirmed = window.confirm(`${leftRailClearCount.value} Elemente löschen?`)
    if (!confirmed) return
  }
  notes.clearNotes()
  selection.clearSelection()
  const top = Number(timelineSettings.beatTop) || 4
  const bottom = Number(timelineSettings.beatBottom) || 4
  const blocksPerBar = Math.max(1, Number((top * (4 / bottom)).toFixed(3)))
  const bars = Math.max(1, Number(TIMELINE_LAYOUT.bars.defaultCount) || 2)
  timelineSettings.setTimelineLengthBlocks(Number((blocksPerBar * bars).toFixed(3)))
}

function currentTimelineInsertConfig() {
  let gridIndex = nextGridIndexFromNotes(notes.activeNotes, { mode: timelineSettings.selectedMode })

  const tMs = Number(transport.playheadMs)
  if (Number.isFinite(tMs) && tMs > 0) {
    const idx = tMs / DEFAULT_TIME_PER_BLOCK_MS + 1
    if (Number.isFinite(idx) && idx > 0) {
      if (timelineSettings.snapEnabled && transport.playState !== 'playing') {
        const snapStep = snapStepBlocksForMode(timelineSettings.simGroupMode, TIMELINE_SNAP_STEP_BLOCKS)
        const snappedBlocks = Math.round((idx - 1) / snapStep) * snapStep
        gridIndex = Math.max(1, snappedBlocks + 1)
      } else {
        gridIndex = idx
      }
    }
  }

  const lengthMode = timelineSettings.selectedMode === 'sim'
    ? timelineSettings.lastRhythmMode
    : timelineSettings.selectedMode
  const noteValue = normalizeNoteValue(lengthMode) || '1/4'

  let lengthBlocks = defaultLengthBlocksForMode(noteValue)
  const rawSimGroupMode = String(timelineSettings.simGroupMode || '')
  const simGroupMode = rawSimGroupMode === 'dot' ? 'dotted' : rawSimGroupMode
  const subdivision = simGroupMode === '3' ? 3 : 2
  if (simGroupMode === 'dotted' && Number(lengthBlocks) > 0.25) {
    lengthBlocks = Number(lengthBlocks) * 1.5
  } else if (simGroupMode === '3') {
    lengthBlocks = Number((Number(lengthBlocks) * (2 / 3)).toFixed(4))
  }

  return {
    gridIndex,
    noteValue,
    lengthBlocks,
    subdivision,
    color: timelineSettings.selectedColor,
  }
}

function addActiveChordToTimeline() {
  const positions = Array.isArray(harmony.activeChordShape?.positions) ? harmony.activeChordShape.positions : []
  if (!positions.length) return

  const insert = currentTimelineInsertConfig()
  const placedAtMs = Date.now()
  const notesToAdd = positions.map((pos) => ({
    key: createNoteKey(),
    fret: Number(pos?.fret),
    string: Number(pos?.string),
    color: insert.color,
    noteValue: insert.noteValue,
    gridIndex: insert.gridIndex,
    lengthBlocks: insert.lengthBlocks,
    subdivision: insert.subdivision,
    placedAtMs,
  }))

  const added = notes.addNotes(notesToAdd, { tag: 'addChord' })
  if (!added.length) return

  selection.setSelectedNotes(added.map((note) => String(note?.key || '')).filter(Boolean))

  const chordEnd = insert.gridIndex - 1 + insert.lengthBlocks
  const nextTimelineLength = Math.max(Number(timelineSettings.timelineLengthBlocks) || 0, chordEnd)
  if (nextTimelineLength > 0) timelineSettings.setTimelineLengthBlocks(nextTimelineLength)
}

function updateNumFrets(value) {
  numFrets.value = Math.max(1, Math.floor(Number(value) || 12))
}

onMounted(async () => {
  if (viewMode.value === 'desktop' && shouldDefaultToPhoneView()) {
    viewMode.value = 'phone'
  }
  updateViewportHeightUnit()
  updateViewportOrientationFlag()
  window.visualViewport?.addEventListener?.('resize', updateViewportHeightUnit)
  window.visualViewport?.addEventListener?.('scroll', updateViewportHeightUnit)
  window.addEventListener('resize', updateViewportHeightUnit)
  window.addEventListener('orientationchange', updateViewportHeightUnit)
  window.addEventListener('resize', updateViewportOrientationFlag)
  window.addEventListener('orientationchange', updateViewportOrientationFlag)
  installAudioAutoWarmup({ instrumentType: instrument.instrumentType })
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'guitarjemp' || storedTheme === 'guitarjempDark') {
    applyTheme(storedTheme)
  }
  applyConfiguredDefaultTimelineLength()
  corePadResizePx.value = 0
  window.addEventListener('pointerdown', onWindowPointerDown, true)
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
  window.visualViewport?.removeEventListener?.('resize', updateViewportHeightUnit)
  window.visualViewport?.removeEventListener?.('scroll', updateViewportHeightUnit)
  window.removeEventListener('resize', updateViewportHeightUnit)
  window.removeEventListener('orientationchange', updateViewportHeightUnit)
  window.removeEventListener('resize', updateViewportOrientationFlag)
  window.removeEventListener('orientationchange', updateViewportOrientationFlag)
  window.removeEventListener('pointerdown', onWindowPointerDown, true)
})
</script>

<template>
  <div class="app-layout" :style="appLayoutStyle" :class="{
    'is-phone-view': isPhoneView,
    'is-watch-view': isWatchView,
    'is-compact-view': isCompactView,
    'is-comment-mode': isCommentMode,
    'is-sidebar-hidden': !sidebarVisible,
    'is-debug-viewport': debugViewportFrameActive,
  }">
    <AuthDialog v-model="authOpen" />
    <ConnectionsDialog v-model="connectionsOpen" />
    <input ref="importFilesInputEl" type="file"
      accept=".musicxml,.xml,application/vnd.recordare.musicxml+xml,text/xml,application/xml" multiple hidden
      @change="onImportFilesChange" />

    <div class="app-menu-bar" aria-label="Main menu">
      <div class="app-menu-brand">GuitarJemp</div>
      <v-menu v-if="isPhoneView" location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-menu" variant="text" size="small" class="app-menu-btn app-hamburger-btn"
            aria-label="Open menu" />
        </template>
        <v-list density="compact" min-width="260">
          <v-list-subheader>File</v-list-subheader>
          <v-list-item title="New" @click="openNewSongDialog" />
          <v-list-item title="Save" @click="saveCurrentSong" />
          <v-list-item title="Save As New" @click="openSaveAsNew" />
          <v-list-item title="Reset" @click="resetEditorToDefaultLength" />
          <v-divider class="my-1" />
          <v-list-item title="Import MusicXML" @click="openImportFiles" />
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
          <v-list-item prepend-icon="mdi-view-dashboard-outline" title="Dashboard" @click="openDashboard" />
          <v-divider v-if="mainView !== 'dashboard'" class="my-1" />
          <v-list-subheader v-if="mainView !== 'dashboard'">Share</v-list-subheader>
          <v-list-item v-if="mainView !== 'dashboard'" prepend-icon="mdi-account-edit-outline"
            title="Kontakte verwalten" @click="openShareManager" />
          <v-list-group v-for="contact in mainView !== 'dashboard' ? shareContactsForMenu : []"
            :key="`phone-share-${contact.id}`" :value="`phone-share-${contact.id}`">
            <template #activator="{ props: groupProps }">
              <v-list-item v-bind="groupProps" :title="contact.name" prepend-icon="mdi-account">
                <template #append>
                  <div class="d-inline-flex align-center ga-1">
                    <v-icon v-if="contact.hasEmail" size="16" icon="mdi-email-outline" />
                    <v-icon v-if="contact.hasWhatsApp" size="16" icon="mdi-whatsapp" />
                  </div>
                </template>
              </v-list-item>
            </template>
            <v-list-item v-if="contact.hasEmail" title="Per Mail senden" prepend-icon="mdi-email-outline"
              @click="shareContact(contact, 'email')" />
            <v-list-item v-if="contact.hasWhatsApp" title="Per WhatsApp senden" prepend-icon="mdi-whatsapp"
              @click="shareContact(contact, 'whatsapp')" />
            <v-list-item v-if="contact.hasEmail && contact.hasWhatsApp" title="Per Mail + WhatsApp senden"
              prepend-icon="mdi-send-circle-outline" @click="shareContact(contact, 'both')" />
            <v-list-item v-if="!contact.hasEmail && !contact.hasWhatsApp" title="Keine Mail/WhatsApp hinterlegt"
              prepend-icon="mdi-alert-circle-outline" disabled />
          </v-list-group>
          <v-list-item v-if="mainView !== 'dashboard' && shareContactsForMenu.length === 0" title="Keine Kontakte" />
          <v-divider class="my-1" />
          <v-list-subheader>View</v-list-subheader>
          <v-list-item title="Desktop" @click="viewMode = 'desktop'" />
          <v-list-item title="Phone" @click="viewMode = 'phone'" />
          <v-list-item title="Watch" @click="viewMode = 'watch'" />
        </v-list>
      </v-menu>
      <span class="app-version-label">{{ APP_VERSION_LABEL }}</span>
      <v-menu v-if="!isPhoneView" location="bottom start">
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
          <v-list-item title="Import MusicXML" @click="openImportFiles" />
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
          <div class="text-caption">Viewport</div>
          <v-btn-toggle :model-value="viewMode" mandatory divided
            @update:model-value="(v) => (viewMode = String(v || 'desktop'))">
            <v-btn value="desktop" size="small" variant="tonal">Desktop</v-btn>
            <v-btn value="phone" size="small" variant="tonal">Phone</v-btn>
            <v-btn value="watch" size="small" variant="tonal">Watch</v-btn>
          </v-btn-toggle>
        </v-card>
      </v-menu>
      <v-btn v-if="!isCompactView" variant="text" size="small" class="app-menu-btn" :active="sidebarVisible"
        @click="sidebarVisible = !sidebarVisible">
        Toolbar
      </v-btn>
      <v-menu v-if="!isCompactView && mainView !== 'dashboard'" location="bottom start">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="text" size="small" class="app-menu-btn" aria-label="Share">
            <v-icon size="18">mdi-export-variant</v-icon>
          </v-btn>
        </template>
        <v-list density="compact" min-width="220">
          <v-list-item prepend-icon="mdi-account-edit-outline" title="Kontakte verwalten" @click="openShareManager" />
          <v-divider class="my-1" />
          <v-list-subheader>Kontakte</v-list-subheader>
          <v-list-group v-for="contact in shareContactsForMenu" :key="contact.id" :value="contact.id">
            <template #activator="{ props: groupProps }">
              <v-list-item v-bind="groupProps" :title="contact.name" prepend-icon="mdi-account">
                <template #append>
                  <div class="d-inline-flex align-center ga-1">
                    <v-icon v-if="contact.hasEmail" size="16" icon="mdi-email-outline" />
                    <v-icon v-if="contact.hasWhatsApp" size="16" icon="mdi-whatsapp" />
                  </div>
                </template>
              </v-list-item>
            </template>
            <v-list-item v-if="contact.hasEmail" title="Per Mail senden" prepend-icon="mdi-email-outline"
              @click="shareContact(contact, 'email')" />
            <v-list-item v-if="contact.hasWhatsApp" title="Per WhatsApp senden" prepend-icon="mdi-whatsapp"
              @click="shareContact(contact, 'whatsapp')" />
            <v-list-item v-if="contact.hasEmail && contact.hasWhatsApp" title="Per Mail + WhatsApp senden"
              prepend-icon="mdi-send-circle-outline" @click="shareContact(contact, 'both')" />
            <v-list-item v-if="!contact.hasEmail && !contact.hasWhatsApp" title="Keine Mail/WhatsApp hinterlegt"
              prepend-icon="mdi-alert-circle-outline" disabled />
          </v-list-group>
          <v-list-item v-if="shareContactsForMenu.length === 0" title="Keine Kontakte" />
        </v-list>
      </v-menu>

      <div class="app-menu-right">
        <v-chip v-if="auth.isSignedIn && !isPhoneView" size="small" color="success" variant="tonal"
          :prepend-avatar="currentUserAvatarUrl" class="app-user-chip"
          @click="mainView === 'dashboard' ? closeDashboard() : openDashboard()">
          {{ currentUserDisplayName }}
        </v-chip>
        <v-menu v-if="isCompactView && !isWatchView" location="bottom end" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" variant="tonal" size="small" class="app-menu-tools-btn" prepend-icon="mdi-tools">
              Tools
            </v-btn>
          </template>
          <v-card class="app-phone-tools-menu" min-width="260">
            <FretboardContextMenu />
          </v-card>
        </v-menu>
        <v-btn v-else-if="isWatchView" variant="tonal" size="small" class="app-menu-tools-btn" prepend-icon="mdi-tools"
          disabled>
          Tools
        </v-btn>
        <v-menu location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="small" variant="tonal" prepend-icon="mdi-account">
              Account
            </v-btn>
          </template>
          <v-list density="compact" min-width="180">
            <v-list-item :prepend-icon="auth.isSignedIn ? 'mdi-logout' : 'mdi-login'"
              :title="auth.isSignedIn ? 'Logout' : 'Login'"
              @click="auth.isSignedIn ? auth.signOut() : (authOpen = true)" />
            <v-list-item prepend-icon="mdi-account-multiple" title="Friends" :disabled="!auth.isSignedIn"
              @click="connectionsOpen = true" />
            <v-list-item prepend-icon="mdi-view-dashboard-outline" title="Dashboard" @click="openDashboard" />
          </v-list>
        </v-menu>
      </div>

    </div>

    <div v-if="dotGroupMenu.open" class="dot-group-context-menu"
      :style="{ left: `${dotGroupMenu.x}px`, top: `${dotGroupMenu.y}px` }">
      <button type="button" class="dot-group-context-item" @click="renameDotGroup">
        Umbenennen
      </button>
    </div>

    <main v-if="!showPhoneRotateOverlay || mainView === 'dashboard'" class="app-content">
      <aside v-if="mainView !== 'dashboard' && !isCompactView" class="app-left-rail" aria-label="Note value rail">
        <div class="app-left-rail-inner">
          <button v-for="item in leftRailNoteItems" :key="item.value" type="button" class="app-left-rail-note-btn"
            :class="{ 'is-active': leftRailNoteValue === item.value }" :title="item.title"
            @click="leftRailNoteValue = item.value">
            <span class="app-left-rail-note-glyph" aria-hidden="true">{{ item.glyph }}</span>
          </button>

          <div class="app-left-rail-divider" aria-hidden="true"></div>

          <button type="button" class="app-left-rail-note-btn app-left-rail-small-btn"
            :class="{ 'is-active': leftRailModifier === 'dotted' }" :title="t('modeSelector.dotted')"
            @click="leftRailModifier = leftRailModifier === 'dotted' ? '' : 'dotted'">
            <span class="app-left-rail-note-glyph" aria-hidden="true">.</span>
          </button>

          <button type="button" class="app-left-rail-note-btn app-left-rail-small-btn"
            :class="{ 'is-active': leftRailModifier === '3' }" :title="t('modeSelector.triplets')"
            @click="leftRailModifier = leftRailModifier === '3' ? '' : '3'">
            <span class="app-left-rail-note-glyph" aria-hidden="true">3</span>
          </button>

          <div class="app-left-rail-divider" aria-hidden="true"></div>

          <button type="button" class="app-left-rail-note-btn app-left-rail-chord-btn"
            :class="{ 'is-active': leftRailChordEnabled }"
            :title="leftRailChordEnabled ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
            @click="timelineSettings.setSelectedMode(leftRailChordEnabled ? String(timelineSettings.lastRhythmMode || '1/4') : 'sim')">
            <span class="app-left-rail-chord-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                <line x1="7.75" y1="2" x2="7.75" y2="22" />
                <ellipse cx="12.4" cy="7.1" rx="5.1" ry="3.6" transform="rotate(-34 12.4 7.1)" />
                <ellipse cx="12.4" cy="15.4" rx="5.1" ry="3.6" transform="rotate(-34 12.4 15.4)" />
              </svg>
            </span>
          </button>

          <div class="app-left-rail-spacer" aria-hidden="true"></div>

          <button type="button" class="app-left-rail-note-btn app-left-rail-comment-btn"
            :class="{ 'is-active': isCommentMode }" title="Comment"
            @click="uiMode.setSurfaceMode(isCommentMode ? SURFACE_MODES.COMPOSE : SURFACE_MODES.COMMENT)">
            <span class="app-left-rail-clear-label">Comment</span>
          </button>

          <button type="button" class="app-left-rail-note-btn app-left-rail-clear-btn" :title="'Clear'"
            @click="clearFretboardFromLeftRail">
            <span class="app-left-rail-clear-label">Clear</span>
          </button>
        </div>
      </aside>
      <div v-if="mainView === 'dashboard'" class="app-dashboard-main">
        <UserDashboardMain :signed-in="auth.isSignedIn" :user="auth.user" :profile="auth.profile"
          :instrument-type="instrument.instrumentType" :library-items="library.items"
          :accepted-count="connections.accepted.length" :incoming-count="connections.incoming.length"
          :outgoing-count="connections.outgoing.length" :share-count="shareContacts.contacts.length"
          :song-name="songName" :active-panel="dashboardPanel" @open-auth="authOpen = true"
          @open-connections="connectionsOpen = true" @open-preferences="preferencesOpen = true"
          @select-panel="selectDashboardPanel" @close-dashboard="closeDashboard" />
        <div class="app-dashboard-right">
          <LibraryPanel v-if="dashboardPanel === 'library'"
            @update-required-frets="(value) => { if (Number(value) > Number(numFrets) || 0) updateNumFrets(value) }" />
          <DashboardDetailPanel v-else :panel="dashboardPanel" :signed-in="auth.isSignedIn" :user="auth.user"
            :profile="auth.profile" :instrument-type="instrument.instrumentType" :library-items="library.items"
            :accepted="connections.accepted" :incoming="connections.incoming" :outgoing="connections.outgoing"
            :user-label-fn="connections.userLabel" :profile-saving="profileSaveBusy" @open-auth="authOpen = true"
            @save-profile="saveDashboardProfile" />
        </div>
      </div>
      <LayoutManager v-else class="app-window-manager">
        <template #pane-a>
          <div v-if="!isCompactView && showFretboard" ref="fretboardMainEl" class="fretboard-main">
            <div class="fretboard-pane-row">
              <div class="fretboard-pane-body">
                <div class="fretboard-pane-corner-tools">
                  <v-menu location="bottom end" :close-on-content-click="false">
                    <template #activator="{ props: menuProps }">
                      <v-btn v-bind="menuProps" class="fretboard-options-btn" size="small" variant="tonal"
                        title="Options" aria-label="Options">
                        <v-icon icon="mdi-cog-outline" size="16" />
                      </v-btn>
                    </template>
                    <div class="fretboard-options-menu pa-3 d-flex flex-column ga-2">
                      <div class="d-flex ga-2">
                        <v-text-field :model-value="instrument.numStrings" density="compact" hide-details type="number"
                          min="1" step="1" label="Strings" style="width: 96px"
                          @update:model-value="(v) => instrument.setNumStrings(v)" />
                        <v-text-field :model-value="numFrets" density="compact" hide-details type="number" min="1"
                          step="1" label="Frets" style="width: 96px" @update:model-value="updateNumFrets" />
                      </div>
                      <v-select v-model="fretboardDotLabelMode" :items="DOT_LABEL_MODE_OPTIONS" density="compact"
                        hide-details label="Dot Labels" variant="outlined"
                        :menu-props="{ contentClass: 'fretboard-options-select-menu' }" />
                      <v-select v-if="fretboardDotLabelMode === 'play-order'" v-model="fretboardPlayOrderScope"
                        :items="PLAY_ORDER_SCOPE_OPTIONS" density="compact" hide-details label="Count Scope"
                        variant="outlined" :menu-props="{ contentClass: 'fretboard-options-select-menu' }" />
                      <v-switch :model-value="timelineSettings.leftHanded" density="compact" hide-details inset
                        label="Left handed" @update:model-value="(v) => timelineSettings.setLeftHanded(Boolean(v))" />
                      <v-switch :model-value="timelineSettings.handPositionVisible" density="compact" hide-details inset
                        label="Hand position track"
                        @update:model-value="(v) => timelineSettings.setHandPositionVisible(Boolean(v))" />
                    </div>
                  </v-menu>
                </div>
                <Fretboard :num-frets="numFrets" :editable="true" :core-resize-px="corePadResizePx"
                  :is-phone-view="false" :style="fretboardStyleVars" />
              </div>
              <div class="fretboard-pane-side">
                <div class="fretboard-pane-side-stack">
                  <div class="fretboard-side-toolbar">
                    <v-menu location="bottom end" :close-on-content-click="false">
                      <template #activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="fretboard-color-btn">
                          Color
                        </v-btn>
                      </template>
                      <div class="fretboard-color-menu pa-2">
                        <ColorPalette orientation="horizontal" />
                      </div>
                    </v-menu>
                  </div>
                  <div class="fretboard-dot-groups" :class="{ 'is-empty': !hasDotGroups }">
                    <div class="fretboard-dot-groups-list">
                      <v-btn variant="tonal" size="small" class="justify-start fretboard-dot-group-btn"
                        :class="{ 'is-active': hasDotGroups && allDotGroupsSelected, 'is-disabled': !hasDotGroups }"
                        :disabled="!hasDotGroups" @click="activateAllDotGroups">
                        All
                      </v-btn>
                      <v-btn v-for="group in usedDotGroups" :key="group.id" variant="tonal" size="small"
                        class="justify-start fretboard-dot-group-btn"
                        :class="{ 'is-active': String(timelineSettings.activeDotGroupColor || '') === group.color }"
                        :style="{ borderLeft: `12px solid ${group.color}` }" :title="group.label"
                        @contextmenu="openDotGroupMenu($event, group)" @click="activateDotGroup(group.color)">
                        {{ group.label }}
                      </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="isCompactView && phonePane === 'fretboard' && showFretboard" ref="fretboardMainEl"
            class="fretboard-main">
            <div class="fretboard-pane-row">
              <div class="fretboard-pane-body">
                <div class="fretboard-pane-corner-tools">
                  <v-menu location="bottom end" :close-on-content-click="false">
                    <template #activator="{ props: menuProps }">
                      <v-btn v-bind="menuProps" class="fretboard-options-btn" size="small" variant="tonal"
                        title="Options" aria-label="Options">
                        <v-icon icon="mdi-cog-outline" size="16" />
                      </v-btn>
                    </template>
                    <div class="fretboard-options-menu pa-3 d-flex flex-column ga-2">
                      <div class="d-flex ga-2">
                        <v-text-field :model-value="instrument.numStrings" density="compact" hide-details type="number"
                          min="1" step="1" label="Strings" style="width: 96px"
                          @update:model-value="(v) => instrument.setNumStrings(v)" />
                        <v-text-field :model-value="numFrets" density="compact" hide-details type="number" min="1"
                          step="1" label="Frets" style="width: 96px" @update:model-value="updateNumFrets" />
                      </div>
                      <v-select v-model="fretboardDotLabelMode" :items="DOT_LABEL_MODE_OPTIONS" density="compact"
                        hide-details label="Dot Labels" variant="outlined"
                        :menu-props="{ contentClass: 'fretboard-options-select-menu' }" />
                      <v-select v-if="fretboardDotLabelMode === 'play-order'" v-model="fretboardPlayOrderScope"
                        :items="PLAY_ORDER_SCOPE_OPTIONS" density="compact" hide-details label="Count Scope"
                        variant="outlined" :menu-props="{ contentClass: 'fretboard-options-select-menu' }" />
                      <v-switch :model-value="timelineSettings.leftHanded" density="compact" hide-details inset
                        label="Left handed" @update:model-value="(v) => timelineSettings.setLeftHanded(Boolean(v))" />
                      <v-switch :model-value="timelineSettings.handPositionVisible" density="compact" hide-details inset
                        label="Hand position track"
                        @update:model-value="(v) => timelineSettings.setHandPositionVisible(Boolean(v))" />
                    </div>
                  </v-menu>
                </div>
                <Fretboard :num-frets="numFrets" :editable="!isWatchView" :core-resize-px="corePadResizePx"
                  :is-phone-view="isPhoneView" :style="fretboardStyleVars" />
              </div>
              <div class="fretboard-pane-side">
                <div class="fretboard-pane-side-stack">
                  <div class="fretboard-side-toolbar">
                    <v-menu location="bottom end" :close-on-content-click="false">
                      <template #activator="{ props: menuProps }">
                        <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="fretboard-color-btn">
                          Color
                        </v-btn>
                      </template>
                      <div class="fretboard-color-menu pa-2">
                        <ColorPalette orientation="horizontal" />
                      </div>
                    </v-menu>
                  </div>
                  <div class="fretboard-dot-groups" :class="{ 'is-empty': !hasDotGroups }">
                    <div class="fretboard-dot-groups-list">
                      <v-btn variant="tonal" size="small" class="justify-start fretboard-dot-group-btn"
                        :class="{ 'is-active': hasDotGroups && allDotGroupsSelected, 'is-disabled': !hasDotGroups }"
                        :disabled="!hasDotGroups" @click="activateAllDotGroups">
                        All
                      </v-btn>
                      <v-btn v-for="group in usedDotGroups" :key="group.id" variant="tonal" size="small"
                        class="justify-start fretboard-dot-group-btn"
                        :class="{ 'is-active': String(timelineSettings.activeDotGroupColor || '') === group.color }"
                        :style="{ borderLeft: `12px solid ${group.color}` }" :title="group.label"
                        @contextmenu="openDotGroupMenu($event, group)" @click="activateDotGroup(group.color)">
                        {{ group.label }}
                      </v-btn>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Timeline v-else-if="isCompactView && phonePane === 'timeline' && showTimeline" ref="timelineRef"
            :num-frets="numFrets" :compact="isCompactView" :library-panel-visible="false"
            :transport-visible="transportVisible" :external-undo-tick="timelineUndoTick"
            :external-redo-tick="timelineRedoTick" @update-transport-visible="(v) => (transportVisible = Boolean(v))" />
          <LibraryPanel v-else-if="isCompactView && phonePane === 'library'"
            @update-required-frets="(value) => { if (Number(value) > Number(numFrets) || 0) updateNumFrets(value) }" />
        </template>
        <template #pane-b>
          <div class="pane-b-stack">
            <div class="pane-b-tabs">
              <v-tabs v-model="workspacePanelTab" density="compact" class="browser-tabs">
                <v-tab value="timeline" class="browser-tab">Timeline</v-tab>
                <v-tab value="library" class="browser-tab">Library</v-tab>
              </v-tabs>
            </div>
            <div class="pane-b-content">
              <Timeline v-if="showTimeline" v-show="workspacePanelTab === 'timeline'" ref="timelineRef"
                :num-frets="numFrets" :compact="isCompactView" :library-panel-visible="false"
                :transport-visible="transportVisible" :external-undo-tick="timelineUndoTick"
                :external-redo-tick="timelineRedoTick"
                @update-transport-visible="(v) => (transportVisible = Boolean(v))" />
              <LibraryPanel v-show="workspacePanelTab === 'library'" />
            </div>
          </div>
        </template>
        <template #sidebar>
          <div class="app-sidebar-content">
            <div class="app-sidebar-tabs">
              <button type="button" class="app-sidebar-tab" :class="{ 'is-active': sidebarTab === 'shapes' }"
                @click="sidebarTab = 'shapes'">
                Shapes
              </button>
              <button type="button" class="app-sidebar-tab" :class="{ 'is-active': sidebarTab === 'scale' }"
                @click="sidebarTab = 'scale'">
                Scales
              </button>
              <button type="button" class="app-sidebar-tab" :class="{ 'is-active': sidebarTab === 'chords' }"
                @click="sidebarTab = 'chords'">
                Chords
              </button>
            </div>
            <div class="app-sidebar-panel">
              <div v-if="sidebarTab === 'shapes'" class="app-sidebar-menu app-sidebar-empty" />
              <div v-else-if="sidebarTab === 'scale'" class="app-sidebar-form">
                <section class="app-sidebar-section">
                  <div class="app-sidebar-section-title">Scale Display</div>
                  <v-switch :model-value="harmony.showScale" density="compact" hide-details inset color="primary"
                    label="Show Scale" @update:model-value="(v) => (harmony.showScale = Boolean(v))" />
                </section>
                <section class="app-sidebar-section">
                  <div class="app-sidebar-section-title">Scale Setup</div>
                  <v-select :model-value="harmony.scaleRoot" :items="SONG_KEY_OPTIONS" label="Root" density="compact"
                    hide-details @update:model-value="(v) => (harmony.scaleRoot = String(v || 'C'))" />
                  <v-select :model-value="harmony.scaleType" :items="SCALE_TYPE_OPTIONS" label="Scale Type"
                    density="compact" hide-details
                    @update:model-value="(v) => (harmony.scaleType = String(v || SCALE_TYPE_OPTIONS[0]))" />
                  <v-select :model-value="harmony.position" :items="SCALE_POSITION_OPTIONS" label="Position"
                    density="compact" hide-details
                    @update:model-value="(v) => (harmony.position = String(v || 'Open'))" />
                  <v-select :model-value="harmony.pattern" :items="SCALE_PATTERN_OPTIONS" label="Pattern"
                    density="compact" hide-details
                    @update:model-value="(v) => (harmony.pattern = String(v || SCALE_PATTERN_OPTIONS[0]))" />
                </section>
              </div>
              <div v-else class="app-sidebar-form">
                <section class="app-sidebar-section">
                  <div class="app-sidebar-section-title">Chord Display</div>
                  <v-switch :model-value="harmony.showChord" density="compact" hide-details inset color="primary"
                    label="Show Chord Shape" @update:model-value="(v) => (harmony.showChord = Boolean(v))" />
                </section>
                <section class="app-sidebar-section">
                  <div class="app-sidebar-section-title">Chord Setup</div>
                  <v-select :model-value="harmony.chordRoot" :items="SONG_KEY_OPTIONS" label="Root" density="compact"
                    hide-details @update:model-value="(v) => (harmony.chordRoot = String(v || 'C'))" />
                  <v-select :model-value="harmony.chordType" :items="CHORD_TYPE_OPTIONS" label="Chord Type"
                    density="compact" hide-details
                    @update:model-value="(v) => (harmony.chordType = String(v || CHORD_TYPE_OPTIONS[0]))" />
                </section>
                <section class="app-sidebar-section">
                  <div class="app-sidebar-section-title">Voicing</div>
                  <v-switch :model-value="harmony.chordPosition === 'Open'" density="compact" hide-details inset
                    color="primary" label="Open"
                    @update:model-value="(v) => (harmony.chordPosition = Boolean(v) ? 'Open' : '5')" />
                  <v-select :model-value="harmony.chordRootString" :items="[
                    { title: 'String E', value: 'string-e' },
                    { title: 'String A', value: 'string-a' },
                    { title: 'String D', value: 'string-d' },
                  ]" label="Root String" density="compact" hide-details :disabled="harmony.chordPosition === 'Open'"
                    @update:model-value="(v) => (harmony.chordRootString = String(v || 'string-e'))" />
                </section>
                <section class="app-sidebar-section app-sidebar-section-action">
                  <div class="app-sidebar-section-title">Insert</div>
                  <v-btn class="app-sidebar-action" color="primary" variant="tonal"
                    :disabled="!(harmony.activeChordShape?.positions || []).length" @click="addActiveChordToTimeline">
                    Add Chord
                  </v-btn>
                </section>
              </div>
            </div>
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
    <div v-if="showTransportBar && mainView !== 'dashboard'" class="app-transport-wrap">
      <TransportBar :visible="transportVisible" :is-playing="timelineIsPlaying" :tempo="transport.tempo"
        :click-enabled="timelineSettings.clickEnabled" :count-in-enabled="timelineSettings.countInEnabled"
        :auto-follow-enabled="timelineSettings.autoFollowEnabled" :loop-enabled="timelineSettings.loopEnabled"
        :shuffle-enabled="timelineSettings.shuffleEnabled" :instrument-type="instrument.instrumentType"
        :is-phone-view="isCompactView" :phone-pane="phonePane" :playhead="timelinePlayhead"
        :total-duration="timelineTotalDuration" :practice-active="timelinePracticeActive"
        :practice-available="timelinePracticeAvailable" :practice-target-label="timelinePracticeTargetLabel"
        :practice-detected-label="timelinePracticeDetectedLabel" :practice-hint-text="timelinePracticeHintText"
        :practice-match-state="timelinePracticeMatchState" :record-active="timelineRecordActive"
        @toggle-play="timelineTogglePlay" @seek-start="timelineSeekStart" @seek-playhead="timelineSeekPlayhead"
        @update-tempo="transport.setTempo" @update-click="timelineSettings.setClickEnabled"
        @update-count-in-enabled="timelineSettings.setCountInEnabled"
        @update-auto-follow="timelineSettings.setAutoFollowEnabled" @update-loop="timelineSettings.setLoopEnabled"
        @update-shuffle="timelineSettings.setShuffleEnabled"
        @update-phone-pane="(v) => (phonePane = String(v || 'fretboard'))" @toggle-practice="timelineTogglePractice"
        @toggle-record="timelineToggleRecord" />
    </div>

    <v-dialog v-model="saveAsNewOpen" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Save As New</span>
          <v-btn icon="mdi-close" variant="text" @click="saveAsNewOpen = false" />
        </v-card-title>

        <v-card-text>
          <v-text-field v-model="saveAsNewTitle" label="Title" density="compact" variant="outlined" autofocus />
          <v-select v-model="saveAsNewVisibility" :items="[
            { title: 'Private', value: 'private' },
            { title: 'Connections', value: 'connections' },
            { title: 'Public', value: 'public' },
          ]" label="Visibility" density="compact" variant="outlined" />
          <v-text-field v-model="saveAsNewCategory" label="Category" density="compact" variant="outlined" />
        </v-card-text>

        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="saveAsNewOpen = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat"
            :disabled="!hasNotes || !String(saveAsNewTitle ?? '').trim() || saveAsNewBusy" @click="saveAsNewToCloud">
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
          <v-text-field v-model="newSongTitle" label="Title" density="compact" variant="outlined" autofocus />
          <div class="d-flex ga-2">
            <v-text-field v-model="newSongBeatTop" label="Beat Top" density="compact" variant="outlined" type="number"
              min="1" class="flex-1-1" />
            <v-select v-model="newSongBeatBottom" :items="[1, 2, 4, 8]" label="Beat Bottom" density="compact"
              variant="outlined" class="flex-1-1" />
          </div>
          <div class="d-flex ga-2">
            <v-select v-model="newSongKey" :items="SONG_KEY_OPTIONS" label="Key" density="compact" variant="outlined"
              class="flex-1-1" />
            <v-text-field v-model="newSongBars" label="Bars" density="compact" variant="outlined" type="number" min="1"
              class="flex-1-1" />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-switch v-model="newSongPickupEnabled" density="compact" hide-details inset label="Pickup" />
            <v-text-field v-model="newSongPickupBeats" label="Pickup Beats" density="compact" variant="outlined"
              type="number" min="0" class="flex-1-1" />
          </div>
          <div class="d-flex ga-2 align-center">
            <v-switch v-model="newSongShuffleEnabled" density="compact" hide-details inset label="Shuffle" />
            <v-text-field v-model="newSongBpm" label="BPM" density="compact" variant="outlined" type="number" min="30"
              max="260" class="flex-1-1" />
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
          <v-text-field v-model="preferenceToneDuration" label="Tone duration" density="compact" variant="outlined"
            type="number" min="0.1" step="0.1" />
          <v-switch v-model="preferenceSoundPreview" density="compact" hide-details inset label="Sound preview" />
          <v-switch v-model="preferenceDarkMode" density="compact" hide-details inset label="Dark mode" />
          <v-switch :model-value="timelineSettings.idleDotConnectionsVisible" density="compact" hide-details inset
            label="Idle dot connections"
            @update:model-value="(v) => timelineSettings.setIdleDotConnectionsVisible(Boolean(v))" />
          <v-slider :model-value="timelineSettings.idleDotConnectionsOpacity" min="0" max="1" step="0.01" thumb-label
            hide-details density="compact" :disabled="!timelineSettings.idleDotConnectionsVisible"
            label="Idle dot opacity"
            @update:model-value="(v) => timelineSettings.setIdleDotConnectionsOpacity(Number(v))" />
          <v-select v-model="preferenceLanguage" :items="languageItems" label="Language" density="compact"
            variant="outlined" />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="preferencesOpen = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <footer class="app-footer">
      <span>GuitarJemp ©</span>
    </footer>

    <div v-if="isDevMode" class="app-viewport-debug" :class="{ 'is-open': debugViewportOpen }">
      <v-btn size="x-small" variant="tonal" class="app-viewport-debug-toggle" prepend-icon="mdi-cellphone-cog"
        @click="debugViewportOpen = !debugViewportOpen">
        Viewport
      </v-btn>
      <div v-if="debugViewportOpen" class="app-viewport-debug-panel">
        <div class="app-viewport-debug-title">Device Landscape Preset</div>
        <v-select :model-value="debugViewportPreset"
          :items="VIEWPORT_DEBUG_PRESETS.map((p) => ({ title: p.label, value: p.key }))" density="compact" hide-details
          variant="outlined" @update:model-value="(v) => applyViewportDebugPreset(v)" />
        <div class="app-viewport-debug-info">
          <div>effective width: {{ Math.round(effectiveViewportWidthPx) }}px</div>
          <div>effective: {{ Math.round(effectiveViewportHeightPx) }}px</div>
          <div>live: {{ Math.round(viewportHeightUnitPx * 100) }}px</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  --app-left-rail-w: 56px;
  --app-bg: #1e242c;
  --app-bg-elevated: #2a313b;
  --app-bg-panel: #343d49;
  --app-bg-panel-2: #404b58;
  --app-bg-soft: #4b5868;
  --app-border: rgb(255 255 255 / 0.11);
  --app-border-strong: rgb(255 255 255 / 0.18);
  --app-layer-0: #1e242c;
  --app-layer-1: #2a313b;
  --app-layer-2: #343d49;
  --app-layer-3: #404b58;
  --app-layer-4: #4b5868;
  --app-layer-overlay: #566476;
  --app-text: #edf2f7;
  --app-text-muted: #b1bccd;
  --app-text-dim: #94a0b3;
  --app-accent: #d08a43;
  --app-accent-soft: rgb(208 138 67 / 0.18);
  --app-shadow-lg: 0 18px 40px rgb(0 0 0 / 0.22);
  --app-shadow-md: 0 10px 24px rgb(0 0 0 / 0.18);
  --app-radius-md: 12px;
  --app-radius-lg: 16px;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  height: calc((var(--app-vh, 1dvh) * 100) + var(--app-safe-bottom, 0px));
  min-height: calc((var(--app-vh, 1dvh) * 100) + var(--app-safe-bottom, 0px));
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  overscroll-behavior: none;
  background:
    radial-gradient(circle at top, rgb(114 133 166 / 0.2), transparent 38%),
    linear-gradient(180deg, #232a33 0%, var(--app-bg) 100%);
  color: var(--app-text);
}

.app-layout.is-debug-viewport {
  width: min(100%, var(--app-debug-width));
  max-width: var(--app-debug-width);
  margin: 0 auto;
  outline: 1px dashed rgb(255 255 255 / 28%);
  outline-offset: -1px;
}

.app-footer {
  display: flex;
  align-items: center;
  height: 31px;
  padding: 0 14px;
  background: linear-gradient(180deg, rgb(37 44 53 / 0.98), rgb(29 35 43 / 0.98));
  color: var(--app-text-muted);
}

.app-menu-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--app-border);
  background:
    linear-gradient(180deg, rgb(52 61 73 / 0.96), rgb(39 46 56 / 0.97));
  color: var(--app-text);
  box-shadow: 0 1px 0 rgb(255 255 255 / 0.04);
}

.app-menu-brand {
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
  padding-right: 8px;
  margin-right: 4px;
  border-right: 1px solid var(--app-border);
}

.app-version-label {
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--app-text-dim);
  white-space: nowrap;
  margin-right: 4px;
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

.app-user-chip {
  cursor: pointer;
}

.app-phone-tools-menu {
  max-height: min(60vh, 420px);
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-lg);
  background: linear-gradient(180deg, var(--app-bg-panel-2), var(--app-bg-panel));
  box-shadow: var(--app-shadow-lg);
}

.app-menu-btn {
  min-width: auto;
  padding-inline: 8px;
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-muted);
  border-radius: 10px;
}

.app-left-rail {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--app-left-rail-w);
  background:
    linear-gradient(180deg, rgb(39 47 58 / 0.98), rgb(28 34 43 / 0.98));
  border-right: 1px solid rgb(255 255 255 / 0.08);
  box-shadow:
    inset -1px 0 0 rgb(0 0 0 / 0.26),
    inset 1px 0 0 rgb(255 255 255 / 0.03);
  z-index: 2;
}

.app-left-rail-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  height: 100%;
  padding: 8px 8px 12px;
  box-sizing: border-box;
}

.app-left-rail-divider {
  width: 24px;
  height: 1px;
  background: rgb(255 255 255 / 0.08);
  margin: 2px 0;
}

.app-left-rail-spacer {
  flex: 1 1 auto;
}

.app-left-rail-note-btn {
  width: 38px;
  height: 38px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 10px;
  background: linear-gradient(180deg, rgb(56 66 81 / 0.82), rgb(40 47 58 / 0.88));
  color: var(--app-text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    border-color var(--ui-fast),
    box-shadow var(--ui-fast),
    background-color var(--ui-fast),
    transform var(--ui-fast);
}

.app-left-rail-note-btn:hover {
  background: linear-gradient(180deg, rgb(63 74 91 / 0.88), rgb(46 55 69 / 0.92));
  transform: scale(1.06);
}

.app-left-rail-note-btn.is-active {
  border-color: var(--color-primary);
  background: linear-gradient(180deg, rgb(247 241 232 / 0.96), rgb(233 223 210 / 0.94));
  color: rgb(39 45 54 / 0.96);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 58%, transparent),
    0 1px 0 rgb(255 255 255 / 0.14);
}

.app-left-rail-note-glyph {
  font-size: 18px;
  line-height: 1;
}

.app-left-rail-small-btn {
  height: 32px;
}

.app-left-rail-chord-btn {
  padding: 0;
}

.app-left-rail-clear-btn {
  height: 34px;
  width: 38px;
  padding: 0;
  border-color: rgb(207 86 86 / 0.82);
  background: linear-gradient(180deg, rgb(196 76 76 / 0.96), rgb(148 43 43 / 0.98));
  color: rgb(255 241 241 / 0.98);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.12),
    0 8px 14px rgb(83 15 15 / 0.18);
}

.app-left-rail-comment-btn {
  height: 34px;
  width: 38px;
  padding: 0;
}

.app-left-rail-clear-btn:hover {
  background: linear-gradient(180deg, rgb(208 88 88 / 0.98), rgb(161 51 51 / 0.99));
}

.app-left-rail-clear-btn:active {
  background: linear-gradient(180deg, rgb(171 59 59 / 0.98), rgb(129 34 34 / 0.99));
}

.app-left-rail-clear-label {
  font-size: 10px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.app-left-rail-chord-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.app-left-rail-chord-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.app-menu-btn:hover {
  background: rgb(255 255 255 / 0.06);
  color: var(--app-text);
}

.app-hamburger-btn {
  margin-left: 2px;
}

.app-footer {
  border-top: 1px solid var(--app-border);
}

.app-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: none;
  padding-left: var(--app-left-rail-w);
  position: relative;
  z-index: 1;
}

.app-transport-wrap {
  flex: 0 0 auto;
  min-height: 0;
  width: 100%;
  padding-bottom: 0;
  position: relative;
  z-index: 1;
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
  border-left: 1px solid var(--app-border);
  overflow: hidden;
}

.app-window-manager {
  height: 100%;
  min-height: 0;
}

.app-sidebar-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-1) 88%, transparent), color-mix(in srgb, var(--app-layer-0) 92%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.035),
    inset 0 -1px 0 rgb(0 0 0 / 0.24),
    0 18px 38px rgb(0 0 0 / 0.12);
}

.app-sidebar-tabs {
  flex: 0 0 auto;
  padding: 8px 10px 0;
  background: transparent;
  display: flex;
  gap: 6px;
}

.app-sidebar-tab {
  min-height: 31px;
  min-width: 0;
  flex: 1 1 0;
  border: 1px solid rgb(255 255 255 / 0.05);
  border-bottom: 0;
  border-radius: 10px 10px 0 0;
  background: rgb(255 255 255 / 0.03);
  color: var(--app-text-dim);
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  transition: background-color var(--ui-fast), color var(--ui-fast), border-color var(--ui-fast), transform var(--ui-fast);
}

.app-sidebar-tab.is-active {
  background: #3D4854;
  color: var(--app-text);
  border-color: color-mix(in srgb, #3D4854 70%, rgb(255 255 255 / 0.08));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
  transform: translateY(0);
}

.app-sidebar-panel {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0 10px 10px;
  padding: 10px;
  gap: 10px;
  border: 1px solid rgb(255 255 255 / 0.08);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-3) 92%, transparent), color-mix(in srgb, var(--app-layer-2) 94%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.045),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 10px 20px rgb(0 0 0 / 0.12);
}

.app-sidebar-menu {
  flex: 1 1 auto;
  min-height: 0;
}

.app-sidebar-empty {
  border: 0;
  background: transparent;
  box-shadow: none;
}

.app-sidebar-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 0;
}

.app-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 10px;
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 0;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.028), rgb(255 255 255 / 0.01));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.03);
}

.app-sidebar-section-title {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: var(--app-text-dim);
}

.app-sidebar-section-action {
  margin-top: auto;
}

.app-sidebar-action {
  margin-top: 0;
  min-height: 36px;
}

.app-sidebar-panel :deep(.v-input) {
  margin-top: 0;
}

.app-sidebar-panel :deep(.v-field) {
  border-radius: 10px;
  background: linear-gradient(180deg, rgb(45 54 68 / 0.94), rgb(36 43 54 / 0.98));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.035);
}

.app-sidebar-panel :deep(.v-field__outline) {
  opacity: 0.7;
}

.app-sidebar-panel :deep(.v-field__input),
.app-sidebar-panel :deep(.v-select__selection-text),
.app-sidebar-panel :deep(.v-label),
.app-sidebar-panel :deep(.v-selection-control__label) {
  color: var(--app-text);
}

.app-sidebar-panel :deep(.v-btn) {
  border-radius: 10px;
}

.app-layout :deep(.timeline-main) {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

.pane-b-stack {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 12px;
  background: #1E232C;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.045),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 10px 20px rgb(0 0 0 / 0.12);
}

.pane-b-tabs {
  flex: 0 0 auto;
  padding: 0 8px 0;
  border-bottom: 0;
  background: transparent;
}

.pane-b-tabs :deep(.browser-tabs) {
  min-height: 0;
}

.pane-b-tabs :deep(.browser-tabs .v-slide-group__content) {
  gap: 6px;
  align-items: end;
}

.pane-b-tabs :deep(.browser-tab) {
  min-height: 31px;
  min-width: 88px;
  border: 1px solid rgb(255 255 255 / 0.05);
  border-bottom: 0;
  border-radius: 10px 10px 0 0 !important;
  background: rgb(255 255 255 / 0.03);
  color: var(--app-text-dim);
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  box-shadow: none;
  padding-inline: 10px;
  transition:
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.pane-b-tabs :deep(.browser-tab .v-btn__overlay),
.pane-b-tabs :deep(.browser-tab .v-btn__underlay) {
  display: none;
}

.pane-b-tabs :deep(.browser-tab .v-btn__content) {
  justify-content: center;
}

.pane-b-tabs :deep(.browser-tab.v-tab--selected) {
  margin-bottom: -1px;
  background: #3D4854;
  color: var(--app-text);
  border-color: color-mix(in srgb, #3D4854 70%, rgb(255 255 255 / 0.08));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08);
  transform: translateY(1px);
}

.pane-b-tabs :deep(.browser-tab.v-tab--selected::before) {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: #3D4854;
}

.pane-b-tabs :deep(.browser-tabs .v-tabs-slider) {
  display: none;
}

.pane-b-content {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: transparent;
  box-shadow: none;
}

.pane-b-content>* {
  min-height: 0;
  flex: 1 1 auto;
}

.fretboard-main {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px;
  border-radius: 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-layer-1) 88%, transparent), color-mix(in srgb, var(--app-layer-0) 92%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.035),
    inset 0 -1px 0 rgb(0 0 0 / 0.24),
    0 18px 38px rgb(0 0 0 / 0.12);
}

.fretboard-pane-row {
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
  min-height: 0;
  width: 100%;
  gap: 12px;
}

.fretboard-options-btn {
  min-width: 32px;
  width: 32px;
  height: 32px;
  padding-inline: 0;
}

.fretboard-color-btn {
  width: 100%;
  min-width: 0;
  height: 30px;
  border-radius: 10px;
  text-transform: none;
  font-size: 11px;
  font-weight: 700;
}

.fretboard-side-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  width: 100%;
}

.fretboard-color-menu {
  min-width: 184px;
  border: 1px solid rgb(124 175 233 / 0.18);
  border-radius: 14px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-overlay) 96%, transparent), color-mix(in srgb, var(--app-layer-4) 94%, transparent));
  box-shadow:
    0 14px 30px rgb(4 8 14 / 0.44),
    inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.fretboard-pane-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  min-width: 0;
  position: relative;
  padding: 6px 8px 8px;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-3) 92%, transparent), color-mix(in srgb, var(--app-layer-2) 94%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.045),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 10px 20px rgb(0 0 0 / 0.12);
}

.fretboard-pane-corner-tools {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.fretboard-pane-side {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  min-height: 0;
}

.fretboard-pane-side-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  padding: 8px;
  min-height: 100%;
  height: 100%;
  border: 1px solid rgb(116 163 221 / 0.16);
  border-radius: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-4) 88%, transparent), color-mix(in srgb, var(--app-layer-3) 92%, transparent));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.05),
    inset 0 -1px 0 rgb(0 0 0 / 0.2),
    0 14px 28px rgb(5 10 18 / 0.18);
}

.fretboard-options-menu {
  min-width: 236px;
  border: 1px solid rgb(124 175 233 / 0.18);
  border-radius: var(--app-radius-lg);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--app-layer-overlay) 92%, transparent), color-mix(in srgb, var(--app-layer-4) 96%, transparent));
  box-shadow:
    0 16px 36px rgb(3 8 15 / 0.42),
    0 4px 12px rgb(0 0 0 / 0.24),
    inset 0 1px 0 rgb(255 255 255 / 0.08);
  backdrop-filter: blur(18px);
  transform-origin: top right;
  animation: fretboardOptionsMenuIn 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fretboard-options-menu :deep(.v-input),
.fretboard-options-menu :deep(.v-selection-control) {
  color: var(--app-text);
}

.fretboard-options-menu :deep(.v-label),
.fretboard-options-menu :deep(.v-field-label),
.fretboard-options-menu :deep(.v-selection-control__label) {
  color: rgb(229 236 245 / 0.9);
}

.fretboard-options-menu :deep(.v-field) {
  background: rgb(20 26 35 / 0.7);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.04);
}

.fretboard-options-menu :deep(.v-field__input),
.fretboard-options-menu :deep(.v-select__selection-text),
.fretboard-options-menu :deep(input) {
  color: rgb(244 248 252 / 0.98);
}

.fretboard-options-menu :deep(.v-field__append-inner),
.fretboard-options-menu :deep(.v-field__clearable),
.fretboard-options-menu :deep(.v-icon) {
  color: rgb(220 228 238 / 0.9);
}

.fretboard-options-menu :deep(.v-field--variant-outlined .v-field__outline) {
  --v-field-border-opacity: 1;
  color: rgb(255 255 255 / 0.12);
}

:deep(.fretboard-options-select-menu) {
  border: 1px solid rgb(255 255 255 / 0.12);
  border-radius: 14px;
  background: linear-gradient(180deg, rgb(45 54 68 / 0.99), rgb(31 37 47 / 0.99));
  box-shadow: 0 14px 30px rgb(4 8 14 / 0.44);
}

:deep(.fretboard-options-select-menu .v-list) {
  background: transparent;
  color: rgb(241 246 252 / 0.98);
}

:deep(.fretboard-options-select-menu .v-list-item-title),
:deep(.fretboard-options-select-menu .v-list-item__content) {
  color: rgb(241 246 252 / 0.98);
}

:deep(.fretboard-options-select-menu .v-list-item--active) {
  background: rgb(255 255 255 / 0.06);
}

.fretboard-dot-groups {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 112px;
  min-width: 112px;
  flex: 0 0 112px;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.fretboard-dot-groups-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;
}

.fretboard-dot-groups.is-empty {
  opacity: 0.9;
}

.fretboard-dot-group-btn {
  width: 100%;
  min-width: 0;
  min-height: 28px;
  font-size: 0.67rem;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: var(--radius-sm);
  background: linear-gradient(180deg, rgb(56 66 81 / 0.82), rgb(40 47 58 / 0.88));
  color: var(--app-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 180ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.fretboard-dot-group-btn:hover:not(.is-disabled) {
  background: linear-gradient(180deg, rgb(63 74 91 / 0.88), rgb(46 55 69 / 0.92));
}

.fretboard-dot-group-btn :deep(.v-btn__content) {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  justify-content: flex-start;
}

.fretboard-dot-group-btn.is-active {
  border-color: var(--color-primary);
  background: linear-gradient(180deg, rgb(247 241 232 / 0.96), rgb(233 223 210 / 0.94));
  color: rgb(39 45 54 / 0.96);
  font-weight: 700;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 58%, transparent),
    0 1px 0 rgb(255 255 255 / 0.14);
}

.fretboard-dot-group-btn.is-disabled {
  border-color: rgb(255 255 255 / 0.05);
  background: linear-gradient(180deg, rgb(69 78 92 / 0.4), rgb(45 52 63 / 0.44));
  color: rgb(189 198 210 / 0.42);
  box-shadow: none;
}

@keyframes fretboardOptionsMenuIn {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.dot-group-context-menu {
  position: fixed;
  z-index: 1800;
  min-width: 168px;
  padding: 6px;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  background: linear-gradient(180deg, var(--app-bg-panel-2), var(--app-bg-panel));
  box-shadow: var(--app-shadow-lg);
}

.dot-group-context-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--app-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.dot-group-context-item:hover {
  background: rgb(255 255 255 / 0.06);
}

.app-layout :deep(.v-btn) {
  border-radius: 10px;
}

.app-layout :deep(.v-btn--variant-tonal) {
  border: 1px solid var(--app-border);
  background: linear-gradient(180deg, rgb(43 52 66 / 0.88), rgb(32 38 49 / 0.92));
  color: var(--app-text);
  box-shadow: none;
}

.app-layout :deep(.v-btn--variant-text) {
  color: var(--app-text-muted);
}

.app-layout :deep(.v-btn--variant-flat) {
  background: linear-gradient(180deg, color-mix(in srgb, var(--app-accent) 82%, #f5c27a 18%), color-mix(in srgb, var(--app-accent) 92%, #a85f24 8%));
  color: #16130f;
}

.app-layout :deep(.v-field) {
  border-radius: 12px;
}

.app-layout :deep(.v-field--variant-outlined .v-field__outline) {
  color: var(--app-border);
}

.app-layout :deep(.v-field) {
  background: linear-gradient(180deg, rgb(33 40 51 / 0.98), rgb(27 33 43 / 0.98));
  color: var(--app-text);
}

.app-layout :deep(.v-field-label),
.app-layout :deep(.v-select__selection),
.app-layout :deep(.v-field__input),
.app-layout :deep(.v-input input) {
  color: var(--app-text) !important;
}

.app-layout :deep(.v-field--focused .v-field__outline) {
  color: color-mix(in srgb, var(--app-accent) 78%, var(--app-border));
}

.app-layout :deep(.v-switch .v-label),
.app-layout :deep(.v-input .v-label) {
  color: var(--app-text-muted);
}

.app-layout :deep(.v-card) {
  background: linear-gradient(180deg, var(--app-bg-panel-2), var(--app-bg-panel));
  color: var(--app-text);
  border: 1px solid var(--app-border);
  box-shadow: var(--app-shadow-md);
}

.app-layout :deep(.v-list) {
  background: linear-gradient(180deg, var(--app-bg-panel-2), var(--app-bg-panel));
  color: var(--app-text);
  border: 1px solid var(--app-border);
}

.app-layout :deep(.v-list-item-title),
.app-layout :deep(.v-list-item__prepend),
.app-layout :deep(.v-list-item__append) {
  color: var(--app-text);
}

.fretboard-pane-body>* {
  flex: 1 1 auto;
  min-height: 0;
}

.fretboard-main :deep(.fretboard-body) {
  width: 100%;
  height: 100%;
}

.fretboard-pane-body :deep(.fb-core-pad) {
  filter: drop-shadow(0 10px 18px rgb(0 0 0 / 0.12));
}

.fretboard-pane-body :deep(.fb-fret-numbers) {
  opacity: 0.92;
}

.fretboard-pane-body :deep(.fb-hand-mode-info) {
  margin-top: 6px;
}

.app-layout.is-compact-view :deep(.layout-manager) {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
}

.app-layout.is-compact-view :deep(.layout-sidebar) {
  display: none;
}

.app-layout.is-compact-view :deep(.layout-sidebar-resizer) {
  display: none;
}

.app-layout.is-compact-view :deep(.wm-pane-b),
.app-layout.is-compact-view :deep(.wm-divider) {
  display: none;
}

.app-layout.is-compact-view :deep(.wm-pane-a) {
  flex-basis: 100% !important;
}

.app-layout.is-compact-view .app-footer {
  display: none;
}

.app-layout.is-compact-view .app-menu-bar {
  min-height: 38px;
  padding: 4px 8px;
}

.app-layout.is-compact-view .app-left-rail {
  display: none;
}

.app-layout.is-compact-view .app-transport-wrap {
  padding-bottom: var(--app-safe-bottom);
}

.app-layout.is-comment-mode .app-menu-bar,
.app-layout.is-comment-mode .app-transport-wrap,
.app-layout.is-comment-mode .app-dashboard-main,
.app-layout.is-comment-mode :deep(.wm-pane-b),
.app-layout.is-comment-mode :deep(.layout-sidebar),
.app-layout.is-comment-mode :deep(.timeline-main),
.app-layout.is-comment-mode :deep(.library-panel),
.app-layout.is-comment-mode :deep(.detail-card),
.app-layout.is-comment-mode :deep(.user-dashboard-main) {
  opacity: 0.4;
  filter: grayscale(0.22);
  transition: opacity var(--ui-fast), filter var(--ui-fast);
}

.app-layout.is-comment-mode .fretboard-main,
.app-layout.is-comment-mode .fretboard-main :deep(.fretboard-body) {
  opacity: 1;
  filter: none;
}

.app-layout.is-sidebar-hidden :deep(.layout-manager) {
  grid-template-columns: minmax(0, 1fr);
}

.app-layout.is-sidebar-hidden :deep(.layout-sidebar) {
  display: none;
}

.app-layout.is-sidebar-hidden :deep(.layout-sidebar-resizer) {
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

.app-viewport-debug {
  position: fixed;
  right: 12px;
  bottom: calc(14px + var(--app-safe-bottom));
  z-index: 1400;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.app-viewport-debug-toggle {
  text-transform: none;
}

.app-viewport-debug-panel {
  width: min(280px, 84vw);
  padding: 8px;
  border: 1px solid rgb(0 0 0 / 16%);
  border-radius: 10px;
  background: rgb(20 20 20 / 90%);
  color: #f6f6f6;
  backdrop-filter: blur(4px);
}

.app-viewport-debug-title {
  font-size: 12px;
  margin-bottom: 6px;
}

.app-viewport-debug-info {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.82;
}
</style>
