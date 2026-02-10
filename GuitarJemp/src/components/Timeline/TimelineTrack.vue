<template>
  <div class="string-line">
    <button class="string-label" type="button" :class="{ 'is-active': Number(activeString) === Number(string) }"
      @click="() => emit('update-active-string', Number(string))"
      :title="`Aktive Saite: ${stringLabel || `Saite ${string}`}`">
      {{ stringLabel || `Saite ${string}` }}
    </button>
    <div ref="trackEl" class="timeline-track" :style="trackStyle" @pointerdown="onScrubPointerDown"
      @pointermove="onScrubPointerMove" @pointerup="onScrubPointerUp" @pointercancel="onScrubPointerUp">
      <div class="grid-background" :style="gridBackgroundStyle"></div>
      <div class="playhead-indicator" :style="{ left: playheadPercent + '%' }" title="Position ziehen" />
      <NoteEvent v-for="(note, idx) in notes" :key="note.key ?? `note-${note.fret}-${note.gridIndex}-${idx}`"
        :note="note" :total-blocks="totalBlocks" :color="note.color ?? getNoteColor(note.fret)"
        :time-per-block-ms="timePerBlockMs" :snapEnabled="props.snapEnabled" :step="props.step"
        @update-grid-index="(key, gridIndex) => emit('update-note-grid-index', key, gridIndex)"
        @update-length="(key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)"
        @group-move="(anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)" @group-resize="
          (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
        " />
    </div>
  </div>
</template>

<script setup>
import NoteEvent from './NoteEvent.vue'
import { computed, ref } from 'vue'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/config/grid'

const props = defineProps({
  string: Number,
  stringLabel: { type: String, default: '' },
  activeString: { type: Number, default: 1 },
  notes: Array,
  totalDuration: Number,
  totalBlocks: { type: Number, default: 16 },
  playhead: Number,
  snapEnabled: Boolean,
  step: Number,
  beatTop: { type: Number, default: 4 },
  trackMinWidthPx: { type: Number, default: 0 },
})

const emit = defineEmits([
  'update-active-string',
  'update-note-grid-index',
  'update-note-length',
  'group-move-notes',
  'group-resize-notes',
  'seek-playhead',
])

const trackEl = ref(null)
const isScrubbing = ref(false)

const trackStyle = computed(() => {
  const w = Number(props.trackMinWidthPx) || 0
  // Use a fixed width so zoom-in AND zoom-out are visible.
  return w > 0 ? { width: `${w}px`, minWidth: `${w}px` } : {}
})

const playheadPercent = computed(() => {
  const total = Number(props.totalDuration) || 0
  if (!(total > 0)) return 0
  return (Number(props.playhead || 0) / total) * 100
})

function timeFromPointerEvent(e) {
  const el = trackEl.value
  if (!el?.getBoundingClientRect) return null
  const rect = el.getBoundingClientRect()
  const total = Number(props.totalDuration) || 0
  if (!(rect.width > 0) || !(total > 0)) return 0

  const x = Math.min(rect.width, Math.max(0, Number(e?.clientX) - rect.left))
  const rawTime = (x / rect.width) * total

  if (!props.snapEnabled) return rawTime

  const totalBlocks = Math.max(1, Number(props.totalBlocks) || 1)
  const timePerBlock = total / totalBlocks
  if (!(timePerBlock > 0)) return rawTime

  const stepBlocks = TIMELINE_SNAP_STEP_BLOCKS

  const rawBlocks = rawTime / timePerBlock
  const snappedBlocks = Math.round(rawBlocks / stepBlocks) * stepBlocks
  const snappedTime = snappedBlocks * timePerBlock

  return Math.min(total, Math.max(0, snappedTime))
}

function onScrubPointerDown(e) {
  // Don't hijack note dragging/resizing.
  if (e?.target?.closest?.('.note-event')) return
  if (e?.button != null && e.button !== 0) return

  const t = timeFromPointerEvent(e)
  if (t == null) return
  emit('seek-playhead', t)

  isScrubbing.value = true
  trackEl.value?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onScrubPointerMove(e) {
  if (!isScrubbing.value) return
  const t = timeFromPointerEvent(e)
  if (t == null) return
  emit('seek-playhead', t)
}

function onScrubPointerUp() {
  if (!isScrubbing.value) return
  isScrubbing.value = false
}

const beatsPerBar = computed(() => {
  const v = Number.parseInt(props.beatTop, 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const gridBackgroundStyle = computed(() => {
  return {
    '--total-blocks': String(props.totalBlocks),
    '--beats-per-bar': String(beatsPerBar.value),
  }
})

const timePerBlockMs = computed(() => {
  const total = Number(props.totalDuration) || 0
  const blocks = Math.max(1, Number(props.totalBlocks) || 1)
  const v = total / blocks
  return Number.isFinite(v) && v > 0 ? v : 0
})

function getNoteColor(fret) {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']
  return colors[fret % colors.length]
}
</script>

<style scoped>
.string-line {
  display: flex;
  border-bottom: 0;
}

.string-label {
  width: 96px;
  min-width: 96px;
  max-width: 96px;
  padding: 0 10px;
  font-weight: bold;
  color: #666;
  background: #f0f0f0;
  border-right: 1px solid #ddd;
  position: sticky;
  left: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.string-label.is-active {
  color: rgba(20, 20, 20, 0.95);
}

.string-label:focus {
  outline: none;
}

.timeline-track {
  position: relative;
  flex: 1;
  height: 44px;
}

.timeline-track::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(70, 70, 70, 0.35);
  transform: translateY(-0.5px);
  pointer-events: none;
  z-index: 4;
}

.timeline-track {
  touch-action: none;
}

.grid-background {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
  --cell: calc(100% / var(--total-blocks));
  --sub: calc(var(--cell) / 4);
  --bar: calc(var(--cell) * var(--beats-per-bar));
  background-image:
    repeating-linear-gradient(to right,
      rgba(208, 208, 208, 0.35) 0px,
      rgba(208, 208, 208, 0.35) 1px,
      transparent 1px,
      transparent var(--sub)),
    repeating-linear-gradient(to right,
      #d0d0d0 0px,
      #d0d0d0 2px,
      transparent 2px,
      transparent var(--cell)),
    repeating-linear-gradient(to right,
      rgba(70, 70, 70, 0.45) 0px,
      rgba(70, 70, 70, 0.45) 4px,
      transparent 4px,
      transparent var(--bar));
}

.playhead-indicator {
  position: absolute;
  width: 3px;
  height: 100%;
  background: rgba(211, 47, 47, 0.3);
  transform: translateX(-50%);
  z-index: 5;
  cursor: ew-resize;
}
</style>
