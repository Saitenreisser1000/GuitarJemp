<template>
  <div
    class="note-event"
    :style="{ left: leftPercent + '%', width: widthPercent + '%', backgroundColor: color }"
    :title="title"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span class="fret-number">{{ note.fret }}</span>
    <div class="resize-handle" @pointerdown.stop="onResizePointerDown" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
const props = defineProps({
  note: Object,
  totalBlocks: { type: Number, default: 16 },
  color: String,
  snapEnabled: Boolean,
  step: Number
})

const emit = defineEmits(['update-grid-index', 'update-length'])

const isDragging = ref(false)
const dragGridIndex = ref(null)
const isResizing = ref(false)
const dragLength = ref(null)
let startClientX = 0
let startGridIndex = 1
let cellWidthPx = 0
let startLength = 1

const SNAP_STEP = 0.25

const leftPercent = computed(() => {
  const gridIndex = isDragging.value
    ? Number(dragGridIndex.value ?? props.note?.gridIndex ?? 1)
    : Number(props.note?.gridIndex ?? 1)
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  // left edge of the cell: raster 1 => 0%
  return ((gridIndex - 1) / total) * 100
})

const widthPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const len = isResizing.value
    ? Number(dragLength.value ?? props.note?.lengthBlocks ?? 1)
    : Number(props.note?.lengthBlocks ?? 1)
  const safeLen = Number.isFinite(len) && len > 0 ? len : 1
  return (safeLen / total) * 100
})

const title = computed(() => {
  const len = props.note?.lengthBlocks
  return `Bund ${props.note?.fret}, Raster ${props.note?.gridIndex}, Länge ${len}`
})

function clampInt(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function onPointerDown(e) {
  if (isResizing.value) return
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

  el.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onResizePointerDown(e) {
  if (isDragging.value) return
  const handleEl = e.currentTarget
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

  // capture on the note element (parent)
  track.querySelector?.('.note-event')?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e) {
  if (!isDragging.value && !isResizing.value) return
  if (!cellWidthPx) return

  const deltaPx = e.clientX - startClientX
  const total = Math.max(1, Number(props.totalBlocks) || 1)

  if (isDragging.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaSnapped = Math.round(deltaBlocks / SNAP_STEP) * SNAP_STEP
    const next = startGridIndex + deltaSnapped
    // clamp within visible block range
    dragGridIndex.value = Math.min(total, Math.max(1, next))
    return
  }

  if (isResizing.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaSnapped = Math.round(deltaBlocks / SNAP_STEP) * SNAP_STEP
    const maxLen = Math.max(SNAP_STEP, total - (startGridIndex - 1))
    const nextLen = startLength + deltaSnapped
    dragLength.value = Math.min(maxLen, Math.max(SNAP_STEP, nextLen))
  }
}

function onPointerUp() {
  if (isDragging.value) {
    isDragging.value = false
    const next = Number((dragGridIndex.value ?? startGridIndex).toFixed(2))
    dragGridIndex.value = null
    if (props.note?.key) emit('update-grid-index', props.note.key, next)
  }

  if (isResizing.value) {
    isResizing.value = false
    const nextLen = Number((dragLength.value ?? startLength).toFixed(2))
    dragLength.value = null
    if (props.note?.key) emit('update-length', props.note.key, nextLen)
  }
}
</script>

<style scoped>
.note-event {
  position: absolute;
  height: 40px;
  top: 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.note-event:active {
  cursor: grabbing;
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
