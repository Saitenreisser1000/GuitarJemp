<template>
  <TimelineView :is-playing="isPlaying" :tempo="tempo" :selected-mode="selectedMode" :snap-enabled="snapEnabled"
    :sound-preview-enabled="soundPreviewEnabled" :beat-top="beatTop" :beat-bottom="beatBottom"
    :sound-duration-scale="soundDurationScale" :active-string="activeString" :active-tool="activeTool"
    :loop-enabled="loopEnabled" :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
    :zoom-px-per-block="zoomPxPerBlock" :current-step="currentStep" :tracks="tracks" :num-strings="numStrings"
    :num-frets="numFrets" :strings-collapsed="stringsCollapsed" @toggle-play="togglePlay"
    @update-tempo="transport.setTempo" @seek-start="seekStart" @update-loop="settings.setLoopEnabled"
    @update-mode="settings.setSelectedMode" @update-zoom="settings.setZoomPxPerBlock"
    @update-snap="settings.setSnapEnabled" @update-sound-preview="settings.setSoundPreviewEnabled"
    @update-sound-duration-scale="settings.setSoundDurationScale" @update-active-string="settings.setActiveString"
    @update-active-tool="settings.setActiveTool" @update-beat-top="settings.setBeatTop"
    @update-beat-bottom="settings.setBeatBottom" @update-num-strings="instrument.setNumStrings"
    @update-strings-collapsed="settings.setStringsCollapsed" @update-frets="(v) => emit('update-frets', v)"
    @update-note-grid-index="handleUpdateNoteGridIndex" @update-note-length="handleUpdateNoteLength"
    @group-move-notes="handleGroupMoveNotes" @group-resize-notes="handleGroupResizeNotes" @seek-playhead="seekPlayhead"
    @copy-selection="handleCopySelection" @paste-at-playhead="handlePasteAtPlayhead" @undo="handleUndo"
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
import { usePlayback } from '@/composables/usePlayback'
import { useGrid } from '@/composables/useGrid'
import { DEFAULT_TIME_PER_BLOCK_MS, TIMELINE_SNAP_STEP_BLOCKS } from '@/config/grid'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForNote } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'
import { createNoteKey } from '@/domain/note'

defineProps({
  compact: { type: Boolean, default: false },
  numFrets: { type: Number, default: 12 },
})

const emit = defineEmits(['update-frets'])

const store = useNotesStore()
const transport = useTransportStore()
const settings = useTimelineSettingsStore()
const instrument = useInstrumentStore()
const playbackVisuals = usePlaybackVisualsStore()
const selection = useSelectionStore()

const { tempo } = storeToRefs(transport)
const { playheadMs } = storeToRefs(transport)
const {
  selectedMode,
  lastRhythmMode,
  snapEnabled,
  soundPreviewEnabled,
  soundDurationScale,
  activeString,
  activeTool,
  stringsCollapsed,
  loopEnabled,
  beatTop,
  beatBottom,
  zoomPxPerBlock,
} = storeToRefs(settings)
const { numStrings } = storeToRefs(instrument)

const tuning = computed(() => getTuning(instrument.tuningId))

const grid = useGrid()

const stepMap = { '1/16': 0.25, '1/8': 0.5, '1/4': 1, '1/2': 2, 1: 4 }
const effectiveMode = computed(() =>
  selectedMode.value === 'sim' ? lastRhythmMode.value : selectedMode.value,
)
const currentStep = computed(() => stepMap[effectiveMode.value] ?? 1)

const notesForRender = computed(() => {
  return store.activeNotes.map((note, idx) => {
    const key = note?.key
    const fret = note?.fret
    const string = note?.string
    const color = note?.color
    // 1-based raster index stored per note (fallback to insertion order)
    const gridIndex = Number.isFinite(note?.gridIndex) ? note.gridIndex : idx + 1
    const lengthBlocks = Number.isFinite(note?.lengthBlocks) ? note.lengthBlocks : 1
    return { key, fret, string, color, gridIndex, lengthBlocks }
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
  store.pushUndoPoint('move')
  store.setNoteGridIndex(noteKey, gridIndex)
  seekToNoteEnd(noteKey, { gridIndex })
}

function handleUpdateNoteLength(noteKey, lengthBlocks) {
  store.pushUndoPoint('resize')
  store.setNoteLength(noteKey, lengthBlocks)
  seekToNoteEnd(noteKey, { lengthBlocks })
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function quantizeBlocks(v) {
  const raw = Number(v) || 0
  if (!snapEnabled.value) return raw
  return Math.round(raw / TIMELINE_SNAP_STEP_BLOCKS) * TIMELINE_SNAP_STEP_BLOCKS
}

function handleGroupMoveNotes(anchorKey, deltaBlocks) {
  if (playback.isPlaying.value) return

  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (keys.length < 2) return

  const delta = Number(quantizeBlocks(deltaBlocks).toFixed(2))
  if (!delta) return

  store.pushUndoPoint('move')
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

  store.pushUndoPoint('resize')
  const total = Math.max(1, Number(totalBlocks.value) || 1)
  const minLen = snapEnabled.value ? TIMELINE_SNAP_STEP_BLOCKS : 0.01

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
      const fret = Number(n?.fret)
      const string = Number(n?.string)
      const color = typeof n?.color === 'string' ? n.color : null
      return {
        fret,
        string,
        gridIndex: safeGrid,
        lengthBlocks: safeLen,
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
  const idx = t / DEFAULT_TIME_PER_BLOCK_MS + 1
  return Number.isFinite(idx) && idx > 0 ? idx : 1
}

function handlePasteAtPlayhead() {
  if (playback.isPlaying.value) return
  const clip = Array.isArray(selection.clipboardNotes)
    ? selection.clipboardNotes
    : selection.clipboardNotes
  const items = Array.isArray(clip?.value) ? clip.value : Array.isArray(clip) ? clip : []
  if (!items.length) return

  store.pushUndoPoint('paste')

  const minGrid = Math.min(
    ...items.map((n) => Number(n.gridIndex)).filter((v) => Number.isFinite(v)),
  )
  const safeMinGrid = Number.isFinite(minGrid) ? minGrid : 1

  // End edge of the group relative to safeMinGrid (in blocks).
  // Example: a note at grid=1 with len=1 ends at edge=1.
  const endEdge = Math.max(
    0,
    ...items.map((n) => {
      const start = Number(n.gridIndex)
      const len = Number(n.lengthBlocks)
      const safeStart = Number.isFinite(start) && start > 0 ? start : safeMinGrid
      const safeLen = Number.isFinite(len) && len > 0 ? len : 1
      return safeStart - safeMinGrid + safeLen
    }),
  )

  const base = Math.max(1, playheadGridIndex())

  for (const src of items) {
    const offset = (Number(src.gridIndex) || safeMinGrid) - safeMinGrid
    const len = Number(src.lengthBlocks) || 1
    const safeLen = Number.isFinite(len) && len > 0 ? len : 1

    const nextStart = base + offset

    const note = {
      key: createNoteKey(),
      fret: Number(src.fret),
      string: Number(src.string),
      ...(typeof src.color === 'string' && src.color ? { color: src.color } : {}),
      gridIndex: Number(nextStart.toFixed(2)),
      lengthBlocks: Number(safeLen.toFixed(2)),
      placedAtMs: Date.now(),
    }

    store.activeNotes.push(note)
  }

  // Move playhead to the end of the pasted group.
  // Do this after reactive totals update so seekPlayhead doesn't get clamped to the old duration.
  const timePerBlock = Number(grid.grid.value.timePerBlock) || DEFAULT_TIME_PER_BLOCK_MS
  const endMs = Math.max(0, (base - 1 + endEdge) * timePerBlock)
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
  window.removeEventListener('keydown', onGlobalKeyDown)
})
function togglePlay() {
  if (playback.isPlaying.value) {
    playback.pause()
    return
  }

  // If we're at/after the end, restart from 0.
  if (Number(playhead.value) >= Number(totalDuration.value || 0)) {
    seekPlayhead(0)
    lastAudioTickMs = -Infinity
    triggeredNoteKeys = new Set()
    playbackVisuals.clear()
  }

  // Ensure note events exactly at the current playhead get triggered on the first tick.
  // Example: first note at 0ms when starting from the beginning.
  const ph = Number(playhead.value)
  lastAudioTickMs = (Number.isFinite(ph) ? ph : 0) - 0.0001

  // Count-in only when starting from the beginning (not when resuming mid-timeline).
  const shouldCountIn = (Number.isFinite(ph) ? ph : 0) <= 0.0001
  const tempoValue = Number(transport.tempo) || 120
  const countInMs = shouldCountIn ? Math.max(0, 60000 / tempoValue) : 0

  playback.start(totalDuration.value, transport.tempo, { delayMs: countInMs })
}

function seekStart() {
  // Only reposition the playhead; do not start playback.
  seekPlayhead(0)
}

function seekPlayhead(tMs) {
  const total = Number(totalDuration.value) || 0
  const t = Math.min(total, Math.max(0, Number(tMs) || 0))

  // Keep audio triggering consistent after scrubbing/auto-seeking.
  // Set these *before* calling playback.seek(), because seek triggers onTick().
  lastAudioTickMs = t
  triggeredNoteKeys = new Set()
  playbackVisuals.clear()

  transport.setPlayheadMs(t)

  playback.seek(t)
  playhead.value = t
  transport.setPlayheadMs(t)
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

  const timePerBlock = Number(grid.grid.value.timePerBlock) || DEFAULT_TIME_PER_BLOCK_MS
  const endMs = (safeGridIndex - 1 + safeLen) * timePerBlock
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
    seekToNoteEnd(addedKey)
  },
)

const totalDuration = computed(() => {
  // Timeline duration is derived from number of raster blocks (not from note "time")
  return totalBlocks.value * grid.grid.value.timePerBlock
})

const totalBlocks = computed(() => {
  const beatTopValue = Number(beatTop.value) || 4
  const beatBottomValue = Number(beatBottom.value) || 4
  const blocksPerBarRaw = beatTopValue * (4 / beatBottomValue)
  const blocksPerBar = Math.max(
    1,
    Math.ceil(Number.isFinite(blocksPerBarRaw) ? blocksPerBarRaw : 4),
  )

  const maxEnd = Math.max(
    0,
    ...notesForRender.value.map((n) => {
      const start = Number(n.gridIndex) || 0
      const len = Number(n.lengthBlocks) || 1
      return start + Math.max(0, len) - 1
    }),
  )

  // Keep 1 bar of space to the right; minimum timeline is 1 bar.
  const withPadding = Math.ceil(maxEnd + blocksPerBar)
  return Math.max(blocksPerBar, withPadding)
})

const playhead = ref(0)
let lastAudioTickMs = -Infinity
let triggeredNoteKeys = new Set()

function maybePlayNotesAt(tMs) {
  if (!soundPreviewEnabled.value) return

  const t0 = lastAudioTickMs
  const t1 = tMs
  lastAudioTickMs = tMs

  const t = tuning.value
  if (!t) return

  const tempoValue = Number(tempo.value) || 120
  const tempoScale = 120 / tempoValue
  const timePerBlock = Number(grid.grid.value.timePerBlock) || DEFAULT_TIME_PER_BLOCK_MS

  for (const note of store.activeNotes) {
    const key = note?.key
    if (!key || triggeredNoteKeys.has(key)) continue

    const gridIndex = Number(note?.gridIndex)
    if (!Number.isFinite(gridIndex)) continue

    const startMs = (gridIndex - 1) * timePerBlock
    if (!(startMs > t0 && startMs <= t1)) continue

    const midi = midiForNote(note, t)
    if (!Number.isFinite(Number(midi))) continue

    const lengthBlocks = Number(note?.lengthBlocks)
    const len = Number.isFinite(lengthBlocks) && lengthBlocks > 0 ? lengthBlocks : 1
    const durationPlayheadMs = len * timePerBlock
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
      triggeredNoteKeys = new Set()
      playbackVisuals.clear()
    }
    playhead.value = t
    transport.setPlayheadMs(t)
    playbackVisuals.prune(t)
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
