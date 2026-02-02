<template>
  <TimelineView :is-playing="isPlaying" :tempo="tempo" :selected-mode="selectedMode" :snap-enabled="snapEnabled"
    :sound-preview-enabled="soundPreviewEnabled" :beat-top="beatTop" :beat-bottom="beatBottom"
    :loop-enabled="loopEnabled" :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
    :zoom-px-per-block="zoomPxPerBlock" :current-step="currentStep" :tracks="tracks" @toggle-play="togglePlay"
    @update-tempo="transport.setTempo" @seek-start="seekStart" @update-loop="settings.setLoopEnabled"
    @update-mode="settings.setSelectedMode" @update-zoom="settings.setZoomPxPerBlock"
    @update-snap="settings.setSnapEnabled" @update-sound-preview="settings.setSoundPreviewEnabled"
    @update-beat-top="settings.setBeatTop" @update-beat-bottom="settings.setBeatBottom"
    @update-note-grid-index="handleUpdateNoteGridIndex" @update-note-length="handleUpdateNoteLength"
    @group-move-notes="handleGroupMoveNotes" @group-resize-notes="handleGroupResizeNotes" @seek-playhead="seekPlayhead"
    :compact="compact" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
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

defineProps({
  compact: { type: Boolean, default: false },
})

const store = useNotesStore()
const transport = useTransportStore()
const settings = useTimelineSettingsStore()
const instrument = useInstrumentStore()
const playbackVisuals = usePlaybackVisualsStore()
const selection = useSelectionStore()

const { tempo } = storeToRefs(transport)
const {
  selectedMode,
  lastRhythmMode,
  snapEnabled,
  soundPreviewEnabled,
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
  store.setNoteGridIndex(noteKey, gridIndex)
  seekToNoteEnd(noteKey, { gridIndex })
}

function handleUpdateNoteLength(noteKey, lengthBlocks) {
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

  playback.start(totalDuration.value, transport.tempo)
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
    if (keys.length <= prevKeys.length) return

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
  const maxIndex = Math.max(0, ...notesForRender.value.map((n) => n.gridIndex || 0))
  // keep some space to the right
  return Math.max(16, maxIndex + 8)
})

const playhead = ref(0)
let lastAudioTickMs = 0
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
    const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale)

    triggeredNoteKeys.add(key)
    // Keep the dot "active" for the exact timeline duration (playhead time)
    playbackVisuals.highlight(key, tMs + durationPlayheadMs)
    // But let the audio duration respect tempo (real time)
    void playMidi(midi, { durationMs: durationAudioMs })
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
    maybePlayNotesAt(t)
  },
})
const isPlaying = computed(() => playback.isPlaying.value)

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
