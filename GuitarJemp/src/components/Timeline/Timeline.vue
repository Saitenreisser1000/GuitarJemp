<template>
  <TimelineView :is-playing="isPlaying" :tempo="tempo" :selected-mode="selectedMode" :snap-enabled="snapEnabled"
    :sound-preview-enabled="soundPreviewEnabled" :beat-top="beatTop" :beat-bottom="beatBottom"
    :click-enabled="clickEnabled"
    :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats"
    :count-in-visible="countInVisible" :count-in-beat="countInBeat"
    :loop-start-block="loopStartBlock" :loop-end-block="loopEndBlock"
    :sound-duration-scale="soundDurationScale" :active-string="activeString" :active-tool="activeTool"
    :loop-enabled="loopEnabled" :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
    :zoom-px-per-block="zoomPxPerBlock" :current-step="currentStep" :tracks="tracks" :num-strings="numStrings"
    :num-frets="numFrets" :strings-collapsed="stringsCollapsed" :sim-group-mode="simGroupMode"
    :hand-position-notes="handPositionNotes" :active-notes-visible="activeNotesVisible"
    :library-enabled="libraryEnabled" :is-dark-theme="isDarkTheme"
    @toggle-play="togglePlay"
    @update-tempo="transport.setTempo" @seek-start="seekStart" @update-loop="settings.setLoopEnabled"
    @update-mode="settings.setSelectedMode" @update-zoom="settings.setZoomPxPerBlock"
    @update-snap="settings.setSnapEnabled" @update-sound-preview="settings.setSoundPreviewEnabled"
    @update-click="settings.setClickEnabled"
    @update-sound-duration-scale="settings.setSoundDurationScale" @update-active-string="settings.setActiveString"
    @update-active-tool="settings.setActiveTool" @update-beat-top="settings.setBeatTop"
    @update-beat-bottom="settings.setBeatBottom" @update-num-strings="instrument.setNumStrings"
    @update-loop-start-block="settings.setLoopStartBlock"
    @update-loop-end-block="settings.setLoopEndBlock"
    @update-pickup-enabled="settings.setPickupEnabled"
    @update-pickup-beats="settings.setPickupBeats"
    @update-strings-collapsed="settings.setStringsCollapsed" @update-sim-group-mode="settings.setSimGroupMode"
    @update-active-notes-visible="(v) => emit('update-active-notes-visible', Boolean(v))"
    @update-total-blocks="handleUpdateTotalBlocks"
    @open-library="emit('open-library')"
    @toggle-theme="emit('toggle-theme')"
    @update-frets="(v) => emit('update-frets', v)"
    @update-note-grid-index="handleUpdateNoteGridIndex" @update-note-length="handleUpdateNoteLength"
    @update-note-label="handleUpdateNoteLabel"
    @group-move-notes="handleGroupMoveNotes" @group-resize-notes="handleGroupResizeNotes" @seek-playhead="seekPlayhead"
    @add-hand-position="handleAddHandPosition" @copy-selection="handleCopySelection"
    @paste-at-playhead="handlePasteAtPlayhead" @undo="handleUndo"
    @redo="handleRedo" :compact="compact" />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import TimelineView from './TimelineView.vue'
import { useNotesStore } from '@/store/useNotes'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useInstrumentStore } from '@/store/useInstrument'
import { usePlaybackVisualsStore } from '@/store/usePlaybackVisuals'
import { useSelectionStore } from '@/store/useSelection'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { usePlayback } from '@/composables/usePlayback'
import { useGrid } from '@/composables/useGrid'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/config/grid'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForNote } from '@/domain/music/pitch'
import { playMetronomeClick, playMidi } from '@/domain/audio/simpleSynth'
import { createNoteKey } from '@/domain/note'
import {
  gridIndexToStartMs,
  lengthBlocksToDurationMs,
  playheadMsToGridIndex,
  safeTimePerBlockMs,
} from '@/domain/timelineTime'
import {
  buildPastedNotes,
  computePasteRange,
  snapStepBlocksForMode,
} from '@/domain/timelineInteractions'

defineProps({
  compact: { type: Boolean, default: false },
  numFrets: { type: Number, default: 12 },
  activeNotesVisible: { type: Boolean, default: true },
  libraryEnabled: { type: Boolean, default: true },
  isDarkTheme: { type: Boolean, default: false },
})

const emit = defineEmits(['update-frets', 'update-active-notes-visible', 'open-library', 'toggle-theme'])

const store = useNotesStore()
const transport = useTransportStore()
const settings = useTimelineSettingsStore()
const instrument = useInstrumentStore()
const playbackVisuals = usePlaybackVisualsStore()
const selection = useSelectionStore()
const handPositionsStore = useHandPositionsStore()

const { tempo } = storeToRefs(transport)
const { playheadMs } = storeToRefs(transport)
const { handPositions: handPositionNotes } = storeToRefs(handPositionsStore)
const {
  selectedMode,
  lastRhythmMode,
  snapEnabled,
  soundPreviewEnabled,
  clickEnabled,
  soundDurationScale,
  activeString,
  activeTool,
  stringsCollapsed,
  simGroupMode,
  loopEnabled,
  loopStartBlock,
  loopEndBlock,
  beatTop,
  beatBottom,
  pickupEnabled,
  pickupBeats,
  zoomPxPerBlock,
  timelineLengthBlocks,
} = storeToRefs(settings)
const { numStrings } = storeToRefs(instrument)

const tuning = computed(() => getTuning(instrument.tuningId))

const grid = useGrid()

const stepMap = { '1/16': 0.25, '1/8': 0.5, '1/4': 1, '1/2': 2, 1: 4 }
const effectiveMode = computed(() =>
  selectedMode.value === 'sim' ? lastRhythmMode.value : selectedMode.value,
)
const currentStep = computed(() => stepMap[effectiveMode.value] ?? 1)
function isHandPositionKey(noteKey) {
  return String(noteKey || '').startsWith('hp_')
}

function blocksPerBar() {
  const top = Number(beatTop.value) || 4
  const bottom = Number(beatBottom.value) || 4
  const raw = top * (4 / bottom)
  const safe = Number.isFinite(raw) && raw > 0 ? raw : 4
  return Number(safe.toFixed(2))
}

function handleUpdateTotalBlocks(nextBlocks) {
  const n = Number(nextBlocks)
  if (!Number.isFinite(n)) return
  const oneBarBlocks = Math.max(1, Number(blocksPerBar()) || 1)
  settings.setTimelineLengthBlocks(Math.max(oneBarBlocks, n))
}

function updateHandPositionNoteGridIndex(noteKey, gridIndex) {
  handPositionsStore.setHandPositionGridIndex(noteKey, gridIndex)
}

function updateHandPositionNoteLength(noteKey, lengthBlocks) {
  handPositionsStore.setHandPositionLength(noteKey, lengthBlocks)
}

function handleAddHandPosition() {
  const len = blocksPerBar()
  const endEdges = handPositionNotes.value.map((n) => {
    const start = Number(n?.gridIndex)
    const l = Number(n?.lengthBlocks)
    const safeStart = Number.isFinite(start) && start > 0 ? start : 1
    const safeLen = Number.isFinite(l) && l > 0 ? l : len
    return safeStart + safeLen
  })
  const nextGrid = endEdges.length ? Math.max(...endEdges) : 1
  handPositionsStore.addHandPosition({
    key: `hp_${createNoteKey()}`,
    fret: '1-4',
    string: 0,
    color: '#9A7B4F',
    gridIndex: Number(nextGrid.toFixed(2)),
    lengthBlocks: len,
  })
}

const notesForRender = computed(() => {
  return store.activeNotes.map((note, idx) => {
    const key = note?.key
    const fret = note?.fret
    const string = note?.string
    const color = note?.color
    const noteValue = typeof note?.noteValue === 'string' ? note.noteValue : ''
    // 1-based raster index stored per note (fallback to insertion order)
    const gridIndex = Number.isFinite(note?.gridIndex) ? note.gridIndex : idx + 1
    const lengthBlocks = Number.isFinite(note?.lengthBlocks) ? note.lengthBlocks : 1
    const subdivision = Number(note?.subdivision) === 3 ? 3 : 2
    return { key, fret, string, color, noteValue, gridIndex, lengthBlocks, subdivision }
  })
})

function notesForString(s) {
  return notesForRender.value.filter((n) => n.string === s)
}

const tracks = computed(() => {
  const n = Number(numStrings.value) || 0
  const openMidi = tuning.value?.openMidi
  const result = []
  for (let stringIdx = 1; stringIdx <= n; stringIdx++) {
    const midi = Array.isArray(openMidi) ? openMidi[stringIdx - 1] : null
    const label = midiToNoteName(midi, { includeOctave: false }) || `Saite ${stringIdx}`
    result.push({ stringIdx, label, notes: notesForString(stringIdx) })
  }
  return result
})

function handleUpdateNoteGridIndex(noteKey, gridIndex) {
  if (isHandPositionKey(noteKey)) {
    updateHandPositionNoteGridIndex(noteKey, gridIndex)
    return
  }
  store.setNoteGridIndex(noteKey, gridIndex)
  seekToNoteEnd(noteKey, { gridIndex })
}

function handleUpdateNoteLength(noteKey, lengthBlocks) {
  if (isHandPositionKey(noteKey)) {
    updateHandPositionNoteLength(noteKey, lengthBlocks)
    return
  }
  store.setNoteLength(noteKey, lengthBlocks)
  seekToNoteEnd(noteKey, { lengthBlocks })
}

function handleUpdateNoteLabel(noteKey, label) {
  if (!isHandPositionKey(noteKey)) return
  handPositionsStore.setHandPositionLabel(noteKey, label)
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function quantizeBlocks(v) {
  const raw = Number(v) || 0
  if (!snapEnabled.value) return raw
  const snapStep = snapStepBlocksForMode(simGroupMode.value, TIMELINE_SNAP_STEP_BLOCKS)
  return Math.round(raw / snapStep) * snapStep
}

function handleGroupMoveNotes(anchorKey, deltaBlocks) {
  if (playback.isPlaying.value) return

  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (keys.length < 2) return

  const delta = Number(quantizeBlocks(deltaBlocks).toFixed(2))
  if (!delta) return

  const total = Math.max(1, Number(totalBlocks.value) || 1)

  for (const k of keys) {
    const note = store.activeNotes.find((n) => n?.key === k)
    if (!note) continue

    const start = Number(note?.gridIndex ?? 1)
    const len = Number(note?.lengthBlocks ?? 1)
    const safeLen = Number.isFinite(len) && len > 0 ? len : 1

    const maxStart = Math.max(1, total - safeLen + 1)
    const next = clamp(start + delta, 1, maxStart)
    store.setNoteGridIndex(k, Number(next.toFixed(2)))
  }

  seekToNoteEnd(anchorKey)
}

function handleGroupResizeNotes(anchorKey, deltaBlocks) {
  if (playback.isPlaying.value) return

  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (keys.length < 2) return

  const delta = Number(quantizeBlocks(deltaBlocks).toFixed(2))
  if (!delta) return

  const total = Math.max(1, Number(totalBlocks.value) || 1)
  const snapStep = snapStepBlocksForMode(simGroupMode.value, TIMELINE_SNAP_STEP_BLOCKS)
  const minLen = snapEnabled.value ? snapStep : 0.01

  for (const k of keys) {
    const note = store.activeNotes.find((n) => n?.key === k)
    if (!note) continue

    const start = Number(note?.gridIndex ?? 1)
    const len = Number(note?.lengthBlocks ?? 1)
    const safeStart = Number.isFinite(start) && start > 0 ? start : 1
    const safeLen = Number.isFinite(len) && len > 0 ? len : 1

    const maxLen = Math.max(minLen, total - (safeStart - 1))
    const next = clamp(safeLen + delta, minLen, maxLen)
    store.setNoteLength(k, Number(next.toFixed(2)))
  }

  seekToNoteEnd(anchorKey)
}

function handleCopySelection() {
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (!keys.length) {
    selection.setClipboardNotes([])
    return
  }

  const keySet = new Set(keys.map(String))
  const picked = store.activeNotes
    .filter((n) => n?.key && keySet.has(String(n.key)))
    .map((n) => {
      const gridIndex = Number(n?.gridIndex)
      const lengthBlocks = Number(n?.lengthBlocks)
      const safeGrid = Number.isFinite(gridIndex) && gridIndex > 0 ? gridIndex : 1
      const safeLen = Number.isFinite(lengthBlocks) && lengthBlocks > 0 ? lengthBlocks : 1
      const subdivision = Number(n?.subdivision) === 3 ? 3 : 2
      const fret = Number(n?.fret)
      const string = Number(n?.string)
      const color = typeof n?.color === 'string' ? n.color : null
      const noteValue = typeof n?.noteValue === 'string' ? n.noteValue : null
      return {
        fret,
        string,
        gridIndex: safeGrid,
        lengthBlocks: safeLen,
        subdivision,
        ...(noteValue ? { noteValue } : {}),
        ...(color ? { color } : {}),
      }
    })
    .filter((n) => Number.isFinite(n.fret) && Number.isFinite(n.string))

  // Keep stable ordering (helps debugging and predictable paste).
  picked.sort((a, b) => a.gridIndex - b.gridIndex)

  selection.setClipboardNotes(picked)
}

function playheadGridIndex() {
  const t = Number(playheadMs.value) || 0
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const idx = playheadMsToGridIndex(t, timePerBlock)
  return Number.isFinite(idx) && idx > 0 ? idx : 1
}

function handlePasteAtPlayhead() {
  if (playback.isPlaying.value) return
  const clip = selection.clipboardNotes
  const items = Array.isArray(clip?.value) ? clip.value : Array.isArray(clip) ? clip : []
  if (!items.length) return

  const { safeMinGrid, endEdge } = computePasteRange(items)

  const base = Math.max(1, playheadGridIndex())

  const notesToInsert = buildPastedNotes(items, {
    baseGridIndex: base,
    safeMinGrid,
    createKey: createNoteKey,
    nowMs: Date.now(),
  })
  store.addNotes(notesToInsert, { tag: 'paste' })

  // Move playhead to the end of the pasted group.
  // Do this after reactive totals update so seekPlayhead doesn't get clamped to the old duration.
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const endMs = Math.max(
    0,
    gridIndexToStartMs(base, timePerBlock) + lengthBlocksToDurationMs(endEdge, timePerBlock),
  )
  void nextTick().then(() => seekPlayhead(endMs))
}

function syncSelectionToExistingNotes() {
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (!keys.length) return
  const existing = new Set(store.activeNotes.map((n) => String(n?.key)).filter(Boolean))
  selection.setSelectedNotes(keys.filter((k) => existing.has(String(k))))
}

function handleUndo() {
  if (playback.isPlaying.value) return
  const ok = store.undo()
  if (ok) syncSelectionToExistingNotes()
}

function handleRedo() {
  if (playback.isPlaying.value) return
  const ok = store.redo()
  if (ok) syncSelectionToExistingNotes()
}

function isEditableTarget(target) {
  const el = target
  const tag = el?.tagName ? String(el.tagName).toLowerCase() : ''
  if (!tag) return false
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
  if (el?.isContentEditable) return true
  return false
}

function onGlobalKeyDown(e) {
  if (!e) return
  if (e.defaultPrevented) return
  if (isEditableTarget(e.target)) return
  if (playback.isPlaying.value) return

  const key = String(e.key || '').toLowerCase()
  const mod = Boolean(e.ctrlKey || e.metaKey)
  if (!mod) return

  if (key === 'z' && !e.shiftKey) {
    e.preventDefault()
    handleUndo()
    return
  }

  if (key === 'z' && e.shiftKey) {
    e.preventDefault()
    handleRedo()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeyDown)
})

onBeforeUnmount(() => {
  clearCountInOverlay()
  window.removeEventListener('keydown', onGlobalKeyDown)
})
function togglePlay() {
  if (playback.isPlaying.value) {
    clearCountInOverlay()
    playback.pause()
    return
  }

  // When starting playback, remove any UI markings (selection / drag previews / leftover pulses).
  selection.clearGroupTransforms()
  selection.clearSelection()
  playbackVisuals.clear()

  // If we're at/after the end, restart from 0.
  if (Number(playhead.value) >= Number(totalDuration.value || 0)) {
    seekPlayhead(0)
    lastAudioTickMs = -Infinity
    lastClickTickMs = -Infinity
    triggeredNoteKeys = new Set()
    playbackVisuals.clear()
  }

  // Ensure note events exactly at the current playhead get triggered on the first tick.
  // Example: first note at 0ms when starting from the beginning.
  const ph = Number(playhead.value)
  lastAudioTickMs = (Number.isFinite(ph) ? ph : 0) - 0.0001
  lastClickTickMs = (Number.isFinite(ph) ? ph : 0) - 0.0001

  const tempoValue = Number(transport.tempo) || 120
  const beatsPerBarRaw = Number.parseInt(String(beatTop.value), 10)
  const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 4
  const countInMs = Math.max(0, (60000 / tempoValue) * beatsPerBar)
  startCountInOverlay(tempoValue, beatsPerBar)

  playback.start(totalDuration.value, transport.tempo, { delayMs: countInMs })
}

function seekStart() {
  // Only reposition the playhead; do not start playback.
  if (!loopEnabled.value) {
    seekPlayhead(0)
    return
  }

  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const loopStartMs = loopRangeBlocks.value.start * timePerBlock
  const loopEndMs = loopRangeBlocks.value.end * timePerBlock
  const currentMs = Number(playhead.value)
  const epsilonMs = 0.5
  const isAtLoopStart = Math.abs(currentMs - loopStartMs) <= epsilonMs
  const isInsideLoop = currentMs >= loopStartMs - epsilonMs && currentMs < loopEndMs - epsilonMs

  if (Number.isFinite(loopStartMs) && Number.isFinite(loopEndMs) && loopEndMs > loopStartMs && isInsideLoop) {
    seekPlayhead(isAtLoopStart ? 0 : loopStartMs)
    return
  }

  seekPlayhead(0)
}

function seekPlayhead(tMs) {
  const total = Number(totalDuration.value) || 0
  const t = Math.min(total, Math.max(0, Number(tMs) || 0))

  // Keep audio triggering consistent after scrubbing/auto-seeking.
  // Set these *before* calling playback.seek(), because seek triggers onTick().
  lastAudioTickMs = t
  lastClickTickMs = t
  triggeredNoteKeys = new Set()
  playbackVisuals.clear()

  transport.setPlayheadMs(t)

  playback.seek(t)
  playhead.value = t
  playbackVisuals.prune(t)
}

function seekToNoteEnd(noteKey, overrides = {}) {
  // Avoid fighting playback while playing.
  if (playback.isPlaying.value) return

  const key = String(noteKey || '')
  if (!key) return
  const note = store.activeNotes.find((n) => n?.key === key)
  if (!note) return

  const gridIndexRaw = overrides?.gridIndex ?? note?.gridIndex
  const lengthBlocksRaw = overrides?.lengthBlocks ?? note?.lengthBlocks

  const gridIndex = Number(gridIndexRaw)
  const lengthBlocks = Number(lengthBlocksRaw)
  if (!Number.isFinite(gridIndex)) return
  if (!Number.isFinite(lengthBlocks)) return

  const safeGridIndex = gridIndex > 0 ? gridIndex : 1
  const safeLen = lengthBlocks > 0 ? lengthBlocks : 1

  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const endMs =
    gridIndexToStartMs(safeGridIndex, timePerBlock) + lengthBlocksToDurationMs(safeLen, timePerBlock)
  seekPlayhead(endMs)
}

watch(
  () => store.activeNotes.map((n) => n?.key).filter(Boolean),
  (keys, prevKeys) => {
    if (playback.isPlaying.value) return
    if (!Array.isArray(prevKeys)) return
    const delta = keys.length - prevKeys.length
    if (delta <= 0) return
    // Paste adds multiple notes; don't auto-seek to a random one.
    if (delta !== 1) return

    const prev = new Set(prevKeys)
    const addedKey = keys.find((k) => !prev.has(k))
    if (!addedKey) return

    // In chord mode, keep the playhead fixed but remember the last created note.
    if (selectedMode.value === 'sim') {
      pendingChordExitSeekNoteKey.value = addedKey
      return
    }

    seekToNoteEnd(addedKey)
  },
)

watch(
  () => selectedMode.value,
  (nextMode, prevMode) => {
    if (playback.isPlaying.value) return
    if (prevMode !== 'sim' || nextMode === 'sim') return

    const key = pendingChordExitSeekNoteKey.value
    pendingChordExitSeekNoteKey.value = null
    if (!key) return
    seekToNoteEnd(key)
  },
)

const totalDuration = computed(() => {
  // Timeline duration is derived from number of raster blocks (not from note "time")
  return totalBlocks.value * grid.grid.value.timePerBlock
})

const autoTotalBlocks = computed(() => {
  const oneBarBlocks = blocksPerBar()
  const blocksPerBarCeil = Math.max(1, Math.ceil(oneBarBlocks))

  const maxNotesEnd = Math.max(
    0,
    ...notesForRender.value.map((n) => {
      const start = Number(n.gridIndex) || 0
      const len = Number(n.lengthBlocks) || 1
      return start + Math.max(0, len) - 1
    }),
  )
  const maxHandPosEnd = Math.max(
    0,
    ...handPositionNotes.value.map((n) => {
      const start = Number(n?.gridIndex) || 0
      const len = Number(n?.lengthBlocks) || oneBarBlocks
      return start + Math.max(0, len) - 1
    }),
  )
  const maxEnd = Math.max(maxNotesEnd, maxHandPosEnd)

  // Keep 1 bar of space to the right; minimum timeline is 1 bar.
  const withPadding = Math.ceil(maxEnd + blocksPerBarCeil)
  return Math.max(blocksPerBarCeil, withPadding)
})

const totalBlocks = computed(() => {
  const manual = Number(timelineLengthBlocks.value) || 0
  if (manual > 0) return manual
  return autoTotalBlocks.value
})

const loopRangeBlocks = computed(() => {
  const total = Math.max(1, Number(totalBlocks.value) || 1)
  const step = Math.max(0.01, Number(currentStep.value) || 1)
  const startRaw = Number(loopStartBlock.value)
  const start = Number.isFinite(startRaw) ? Math.min(Math.max(0, startRaw), total - step) : 0
  const endRaw = Number(loopEndBlock.value)
  const defaultEnd = total
  const endCandidate = Number.isFinite(endRaw) && endRaw > 0 ? endRaw : defaultEnd
  const end = Math.min(total, Math.max(start + step, endCandidate))
  return { start, end }
})

const playhead = ref(0)
let lastAudioTickMs = -Infinity
let lastClickTickMs = -Infinity
let triggeredNoteKeys = new Set()
const pendingChordExitSeekNoteKey = ref(null)
const countInVisible = ref(false)
const countInBeat = ref(0)
let countInTimerId = null

function clearCountInOverlay() {
  if (countInTimerId) {
    clearInterval(countInTimerId)
    countInTimerId = null
  }
  countInVisible.value = false
  countInBeat.value = 0
}

function startCountInOverlay(tempoValue, beatsPerBar) {
  clearCountInOverlay()
  const beatMs = Math.max(1, 60000 / (Number(tempoValue) || 120))
  const beats = Math.max(1, Number.parseInt(String(beatsPerBar), 10) || 4)
  countInVisible.value = true
  const pickupRaw = Number.parseInt(String(pickupBeats.value), 10)
  const pickup = Number.isFinite(pickupRaw) ? Math.max(1, Math.min(Math.max(1, beats - 1), pickupRaw)) : 1
  const startBeat = pickupEnabled.value ? beats - pickup + 1 : 1

  const sequence = []
  for (let i = 0; i < beats; i += 1) {
    sequence.push(((startBeat - 1 + i) % beats) + 1)
  }

  let idx = 0
  const playCountInClick = (beatNumber) => {
    if (!clickEnabled.value) return
    void playMetronomeClick({ accent: Number(beatNumber) === 1 })
  }
  countInBeat.value = sequence[idx]
  playCountInClick(countInBeat.value)
  countInTimerId = setInterval(() => {
    idx += 1
    if (idx >= sequence.length) {
      clearCountInOverlay()
      return
    }
    countInBeat.value = sequence[idx]
    playCountInClick(countInBeat.value)
  }, beatMs)
}

function isBarStartBeat(beatIndex) {
  const beatsPerBarRaw = Number.parseInt(String(beatTop.value), 10)
  const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 4
  if (!pickupEnabled.value) return beatIndex % beatsPerBar === 0

  const rawPickup = Number.parseInt(String(pickupBeats.value), 10)
  const pickup = Number.isFinite(rawPickup)
    ? Math.max(1, Math.min(Math.max(1, beatsPerBar - 1), Math.min(9, rawPickup)))
    : 1

  if (beatIndex < pickup) return false
  return (beatIndex - pickup) % beatsPerBar === 0
}

function maybePlayClickAt(tMs) {
  if (!clickEnabled.value) return

  const t0Raw = lastClickTickMs
  const t1Raw = Number(tMs)
  lastClickTickMs = t1Raw

  const t0 = Number.isFinite(t0Raw) ? t0Raw : -0.0001
  const t1 = Number.isFinite(t1Raw) ? t1Raw : 0

  const beatBottomRaw = Number.parseInt(String(beatBottom.value), 10)
  const bb = [1, 2, 4, 8].includes(beatBottomRaw) ? beatBottomRaw : 4
  const blocksPerBeat = 4 / bb
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
  const msPerBeat = timePerBlock * blocksPerBeat
  if (!(msPerBeat > 0)) return

  const firstBeat = Math.floor(t0 / msPerBeat) + 1
  const lastBeat = Math.floor(t1 / msPerBeat)
  if (lastBeat < firstBeat) return

  for (let b = firstBeat; b <= lastBeat; b += 1) {
    if (b < 0) continue
    void playMetronomeClick({ accent: isBarStartBeat(b) })
  }
}

function maybePlayNotesAt(tMs) {
  if (!soundPreviewEnabled.value) return

  const t0 = lastAudioTickMs
  const t1 = tMs
  lastAudioTickMs = tMs

  const t = tuning.value
  if (!t) return

  const tempoValue = Number(tempo.value) || 120
  const tempoScale = 120 / tempoValue
  const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)

  for (const note of store.activeNotes) {
    const key = note?.key
    if (!key || triggeredNoteKeys.has(key)) continue

    const gridIndex = Number(note?.gridIndex)
    if (!Number.isFinite(gridIndex)) continue

    const startMs = gridIndexToStartMs(gridIndex, timePerBlock)
    if (!(startMs > t0 && startMs <= t1)) continue

    const midi = midiForNote(note, t)
    if (!Number.isFinite(Number(midi))) continue

    const lengthBlocks = Number(note?.lengthBlocks)
    const len = Number.isFinite(lengthBlocks) && lengthBlocks > 0 ? lengthBlocks : 1
    const durationPlayheadMs = lengthBlocksToDurationMs(len, timePerBlock)
    const durScale = Number(soundDurationScale.value)
    const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
    const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

    triggeredNoteKeys.add(key)
    // Keep the dot "active" for the exact timeline duration (playhead time)
    playbackVisuals.highlight(key, tMs + durationPlayheadMs)
    // But let the audio duration respect tempo (real time)
    void playMidi(midi, { durationMs: durationAudioMs, instrumentType: instrument.instrumentType })
  }
}

const playback = usePlayback({
  onTick: (t) => {
    // Loop wrap (or any backwards jump) should reset triggering state.
    if (t < playhead.value) {
      lastAudioTickMs = -Infinity
      lastClickTickMs = -Infinity
      triggeredNoteKeys = new Set()
      playbackVisuals.clear()
    }

    if (loopEnabled.value) {
      const timePerBlock = safeTimePerBlockMs(grid.grid.value.timePerBlock)
      const loopStartMs = loopRangeBlocks.value.start * timePerBlock
      const loopEndMs = loopRangeBlocks.value.end * timePerBlock
      if (Number.isFinite(loopStartMs) && Number.isFinite(loopEndMs) && loopEndMs > loopStartMs) {
        if (t >= loopEndMs) {
          lastAudioTickMs = loopStartMs - 0.0001
          lastClickTickMs = loopStartMs - 0.0001
          triggeredNoteKeys = new Set()
          playbackVisuals.clear()
          // Keep local/store playhead in sync before seek, so the next onTick is not
          // interpreted as a generic backward jump (which would re-trigger old notes).
          playhead.value = loopStartMs
          transport.setPlayheadMs(loopStartMs)
          playback.seek(loopStartMs)
          return
        }
      }
    }

    playhead.value = t
    transport.setPlayheadMs(t)
    playbackVisuals.prune(t)
    if (playback.isPlaying.value) maybePlayClickAt(t)
    if (playback.isPlaying.value) maybePlayNotesAt(t)
  },
})
const isPlaying = computed(() => playback.isPlaying.value)

// Keep local timeline state in sync with the transport store.
// This allows external UI actions (e.g. clearing notes) to reset the playhead.
watch(
  () => playheadMs.value,
  (tMs) => {
    if (playback.isPlaying.value) return

    const t = Math.max(0, Number(tMs) || 0)
    if (t === playhead.value) return

    lastAudioTickMs = t
    lastClickTickMs = t
    triggeredNoteKeys = new Set()
    playbackVisuals.clear()

    playback.seek(t)
    playhead.value = t
    playbackVisuals.prune(t)
  },
  { immediate: true },
)

watch(
  () => loopEnabled.value,
  (v) => playback.setLoop(v),
  { immediate: true },
)

watch(
  () => playback.isPlaying.value,
  (playing) => {
    transport.setPlayState(playing ? 'playing' : 'stopped')
    if (!playing) playbackVisuals.clear()
  },
  { immediate: true },
)
</script>
