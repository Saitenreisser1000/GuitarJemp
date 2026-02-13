<template>
  <div class="string-line" :class="{ 'is-aux-track': props.isAuxTrack }">
    <button class="string-label" type="button" :class="labelClasses"
      @click="onLabelClick" :title="labelTitle">
      <template v-if="props.isAuxTrack">
        <span class="aux-hand-btn" aria-hidden="true">
          <span>✋</span>
          <span class="aux-plus">+</span>
        </span>
      </template>
      <template v-else>
        {{ stringLabel || `Saite ${string}` }}
      </template>
    </button>
    <div ref="trackEl" class="timeline-track" :style="trackStyle" @pointerdown="onScrubPointerDown"
      @pointermove="onScrubPointerMove" @pointerup="onScrubPointerUp" @pointercancel="onScrubPointerUp">
      <div class="grid-background" :style="gridBackgroundStyle"></div>
      <div class="playhead-indicator" :style="{ left: playheadPercent + '%' }" title="Position ziehen" />
      <NoteEvent v-for="(note, idx) in notes" :key="note.key ?? `note-${note.fret}-${note.gridIndex}-${idx}`"
        :note="note" :total-blocks="totalBlocks" :color="note.color ?? getNoteColor(note.fret)"
        :time-per-block-ms="timePerBlockMs" :snapEnabled="props.snapEnabled" :step="props.step"
        :sim-group-mode="props.simGroupMode"
        @update-grid-index="(key, gridIndex) => emit('update-note-grid-index', key, gridIndex)"
        @update-length="(key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)"
        @update-label="(key, label) => emit('update-note-label', key, label)"
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
import { snapStepBlocksForMode } from '@/domain/timelineInteractions'

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
  beatBottom: { type: Number, default: 4 },
  trackMinWidthPx: { type: Number, default: 0 },
  simGroupMode: { type: String, default: '' },
  isAuxTrack: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-active-string',
  'add-aux-item',
  'update-note-grid-index',
  'update-note-length',
  'update-note-label',
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

const labelClasses = computed(() => ({
  'is-active': !props.isAuxTrack && Number(props.activeString) === Number(props.string),
  'is-aux': props.isAuxTrack,
}))

const labelTitle = computed(() => {
  const label = props.stringLabel || `Saite ${props.string}`
  if (props.isAuxTrack) return label
  return `Aktive Saite: ${label}`
})

function onLabelClick() {
  if (props.isAuxTrack) {
    emit('add-aux-item')
    return
  }
  emit('update-active-string', Number(props.string))
}

const snapStepBlocks = computed(() =>
  snapStepBlocksForMode(props.simGroupMode, TIMELINE_SNAP_STEP_BLOCKS),
)

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

  const stepBlocks = snapStepBlocks.value

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
  const v = Number.parseInt(String(props.beatTop), 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const beatBottomValue = computed(() => {
  const v = Number.parseInt(String(props.beatBottom), 10)
  return [1, 2, 4, 8].includes(v) ? v : 4
})

// Blocks are quarter-notes (1 block = 1/4). A beat is 4/beatBottom blocks.
const blocksPerBeat = computed(() => {
  const bb = Number(beatBottomValue.value) || 4
  const v = 4 / bb
  return Number.isFinite(v) && v > 0 ? v : 1
})

const blocksPerBar = computed(() => {
  const v = beatsPerBar.value * blocksPerBeat.value
  return Number.isFinite(v) && v > 0 ? v : 1
})

const gridBackgroundStyle = computed(() => {
  const snapStep = snapStepBlocks.value
  const subdivisionsPerBlock = Math.max(1, Math.round(1 / snapStep))
  return {
    '--total-blocks': String(props.totalBlocks),
    '--blocks-per-beat': String(blocksPerBeat.value),
    '--blocks-per-bar': String(blocksPerBar.value),
    '--subdiv-per-block': String(subdivisionsPerBlock),
  }
})

const timePerBlockMs = computed(() => {
  const total = Number(props.totalDuration) || 0
  const blocks = Math.max(1, Number(props.totalBlocks) || 1)
  const v = total / blocks
  return Number.isFinite(v) && v > 0 ? v : 0
})

function getNoteColor(fret) {
  const colors = ['#D5763D', '#2E7D6E', '#4A78B0', '#B85C4C', '#7F8F4E', '#6E66A9']
  return colors[fret % colors.length]
}
</script>

<style scoped>
.string-line {
  display: flex;
  border-bottom: 0;
}

.string-line.is-aux-track {
  border-bottom: 4px solid rgba(70, 70, 70, 0.75);
  margin-bottom: 4px;
}


.string-label {
  width: 48px;
  min-width: 48px;
  max-width: 48px;
  padding: 0 4px;
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

.string-label.is-aux {
  cursor: pointer;
  color: rgba(70, 70, 70, 0.9);
}

.aux-hand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid rgba(70, 70, 70, 0.45);
  background: rgba(255, 255, 255, 0.45);
  font-size: 17px;
  line-height: 1;
}

.aux-plus {
  font-size: 13px;
  font-weight: 800;
  margin-left: -1px;
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

.string-line.is-aux-track .timeline-track::after {
  content: none;
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
  --sub: calc(var(--cell) / var(--subdiv-per-block));
  --beat: calc(var(--cell) * var(--blocks-per-beat));
  --bar: calc(var(--cell) * var(--blocks-per-bar));
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
      transparent var(--beat)),
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
