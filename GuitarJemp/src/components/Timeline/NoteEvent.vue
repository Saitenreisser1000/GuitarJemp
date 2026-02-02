<template>
  <div class="note-event" :class="{ 'is-selected': isSelected }"
    :data-note-key="note?.key"
    :style="{ left: leftPercent + '%', width: widthPercent + '%', backgroundColor: color }" :title="title"
    @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
    <div class="note-label">
      <span class="fret-number">{{ note.fret }}</span>
      <span v-if="pitchLabel" class="pitch-label">{{ pitchLabel }}</span>
    </div>
    <div class="resize-handle" @pointerdown.stop="onResizePointerDown" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSelectionStore } from '@/store/useSelection'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/config/grid'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForNote } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'
const props = defineProps({
  note: Object,
  totalBlocks: { type: Number, default: 16 },
  color: String,
  snapEnabled: Boolean,
  step: Number,
})

const emit = defineEmits(['update-grid-index', 'update-length', 'group-move', 'group-resize'])

const selection = useSelectionStore()
const instrument = useInstrumentStore()
const settings = useTimelineSettingsStore()
const isSelected = computed(() => selection.isSelected(props.note?.key))
const isGroupSelected = computed(() => isSelected.value && (selection.selectedNoteKeys?.length || 0) > 1)

const pitchLabel = computed(() => {
  const t = getTuning(instrument.tuningId)
  const midi = midiForNote(props.note, t)
  if (!Number.isFinite(Number(midi))) return ''
  return midiToNoteName(midi, { includeOctave: true })
})

const isDragging = ref(false)
const dragGridIndex = ref(null)
const isResizing = ref(false)
const dragLength = ref(null)
let startClientX = 0
let startGridIndex = 1
let cellWidthPx = 0
let startLength = 1

const leftPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const base = Number(props.note?.gridIndex ?? 1)
  const useGroup = isGroupSelected.value && selection.groupDragActive
  const previewDelta =
    isGroupSelected.value && selection.groupDragActive
      ? Number(selection.groupDragDeltaBlocks || 0)
      : 0
  const preview = base + previewDelta
  const gridIndex = useGroup
    ? preview
    : isDragging.value
      ? Number(dragGridIndex.value ?? base)
      : base
  const clamped = Math.min(total, Math.max(1, gridIndex))
  // left edge of the cell: raster 1 => 0%
  return ((clamped - 1) / total) * 100
})

const widthPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const baseLen = Number(props.note?.lengthBlocks ?? 1)
  const useGroup = isGroupSelected.value && selection.groupResizeActive
  const previewDelta =
    isGroupSelected.value && selection.groupResizeActive
      ? Number(selection.groupResizeDeltaBlocks || 0)
      : 0
  const previewLen = baseLen + previewDelta
  const len = useGroup ? previewLen : isResizing.value ? Number(dragLength.value ?? baseLen) : baseLen
  const safeLen = Number.isFinite(len) && len > 0 ? len : 1
  return (safeLen / total) * 100
})

const title = computed(() => {
  const len = props.note?.lengthBlocks
  const p = pitchLabel.value
  const pPart = p ? ` (${p})` : ''
  return `Bund ${props.note?.fret}, Saite ${props.note?.string}${pPart}, Raster ${props.note?.gridIndex}, Länge ${len}`
})

function clampInt(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function onPointerDown(e) {
  if (isResizing.value) return
  const key = props.note?.key
  // Preserve multi-selection when dragging any already-selected note.
  if (key && !selection.isSelected(key)) selection.selectNote(key)

  if (settings.soundPreviewEnabled) {
    const t = getTuning(instrument.tuningId)
    const midi = midiForNote(props.note, t)
    if (Number.isFinite(Number(midi))) void playMidi(midi)
  }

  const el = e.currentTarget
  const track = el.closest('.timeline-track')
  if (!track) return

  const rect = track.getBoundingClientRect()
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  cellWidthPx = rect.width / total

  startClientX = e.clientX
  startGridIndex = Number(props.note?.gridIndex ?? 1)
  dragGridIndex.value = startGridIndex
  isDragging.value = true

  if (isGroupSelected.value) selection.setGroupDrag(true, 0)

  el.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onResizePointerDown(e) {
  if (isDragging.value) return
  const key = props.note?.key
  // Preserve multi-selection when resizing any already-selected note.
  if (key && !selection.isSelected(key)) selection.selectNote(key)
  const handleEl = e.currentTarget
  const noteEl = handleEl?.closest?.('.note-event')
  const track = handleEl.closest('.timeline-track')
  if (!track) return

  const rect = track.getBoundingClientRect()
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  cellWidthPx = rect.width / total

  startClientX = e.clientX
  startGridIndex = Number(props.note?.gridIndex ?? 1)
  startLength = Number(props.note?.lengthBlocks ?? 1)
  dragLength.value = startLength
  isResizing.value = true

  if (isGroupSelected.value) selection.setGroupResize(true, 0)

  // capture on this note element
  noteEl?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e) {
  if (!isDragging.value && !isResizing.value) return
  if (!cellWidthPx) return

  const deltaPx = e.clientX - startClientX
  const total = Math.max(1, Number(props.totalBlocks) || 1)

  if (isDragging.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaQuantized = props.snapEnabled
      ? Math.round(deltaBlocks / TIMELINE_SNAP_STEP_BLOCKS) * TIMELINE_SNAP_STEP_BLOCKS
      : deltaBlocks

    if (isGroupSelected.value) {
      selection.setGroupDrag(true, deltaQuantized)
      return
    }

    const next = startGridIndex + deltaQuantized
    // clamp within visible block range
    dragGridIndex.value = Math.min(total, Math.max(1, next))
    return
  }

  if (isResizing.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaQuantized = props.snapEnabled
      ? Math.round(deltaBlocks / TIMELINE_SNAP_STEP_BLOCKS) * TIMELINE_SNAP_STEP_BLOCKS
      : deltaBlocks

    if (isGroupSelected.value) {
      selection.setGroupResize(true, deltaQuantized)
      return
    }
    const maxLen = Math.max(TIMELINE_SNAP_STEP_BLOCKS, total - (startGridIndex - 1))
    const nextLen = startLength + deltaQuantized
    dragLength.value = Math.min(maxLen, Math.max(TIMELINE_SNAP_STEP_BLOCKS, nextLen))
  }
}

function onPointerUp() {
  if (isDragging.value) {
    isDragging.value = false
    if (isGroupSelected.value) {
      const delta = Number((selection.groupDragDeltaBlocks || 0).toFixed(2))
      selection.setGroupDrag(false, 0)
      dragGridIndex.value = null
      if (props.note?.key && delta) emit('group-move', props.note.key, delta)
    } else {
      const next = Number((dragGridIndex.value ?? startGridIndex).toFixed(2))
      dragGridIndex.value = null
      if (props.note?.key) emit('update-grid-index', props.note.key, next)
    }
  }

  if (isResizing.value) {
    isResizing.value = false
    if (isGroupSelected.value) {
      const delta = Number((selection.groupResizeDeltaBlocks || 0).toFixed(2))
      selection.setGroupResize(false, 0)
      dragLength.value = null
      if (props.note?.key && delta) emit('group-resize', props.note.key, delta)
    } else {
      const nextLen = Number((dragLength.value ?? startLength).toFixed(2))
      dragLength.value = null
      if (props.note?.key) emit('update-length', props.note.key, nextLen)
    }
  }
}
</script>

<style scoped>
.note-event {
  position: absolute;
  height: 40px;
  top: 10px;
  border-radius: 4px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.note-label {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.note-event.is-selected {
  border-color: rgba(20, 20, 20, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.65);
  z-index: 6;
}

.note-event:active {
  cursor: grabbing;
}

.pitch-label {
  font-size: 11px;
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 10px;
  height: 100%;
  cursor: ew-resize;
  background: rgba(255, 255, 255, 0.18);
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}
</style>
