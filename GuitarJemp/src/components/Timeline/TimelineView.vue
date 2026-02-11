<template>
  <div class="timeline-main" :style="timelineMainStyle">
    <ModeSelector v-if="!compact" :selected-mode="selectedMode" :snap-enabled="snapEnabled"
      :sound-preview-enabled="soundPreviewEnabled" :sound-duration-scale="soundDurationScale" :beat-top="beatTop"
      :beat-bottom="beatBottom" :num-strings="numStrings" :num-frets="numFrets" :strings-collapsed="stringsCollapsed"
      :sim-group-mode="simGroupMode" @update-sim-group-mode="(v) => emit('update-sim-group-mode', v)"
      @update-mode="(v) => emit('update-mode', v)" @update-snap="(v) => emit('update-snap', v)"
      @update-sound-preview="(v) => emit('update-sound-preview', v)"
      @update-sound-duration-scale="(v) => emit('update-sound-duration-scale', v)"
      @update-beat-top="(v) => emit('update-beat-top', v)" @update-beat-bottom="(v) => emit('update-beat-bottom', v)"
      @update-num-strings="(v) => emit('update-num-strings', v)" @update-frets="(v) => emit('update-frets', v)"
      @update-strings-collapsed="(v) => emit('update-strings-collapsed', v)" />

    <div v-if="!compact" class="timeline" :class="{ 'is-collapsed': stringsCollapsed }">
      <div class="timeline-columns">
        <div v-if="!stringsCollapsed" class="timeline-tools" aria-label="Timeline Tools">
          <label class="timeline-tool" :class="{ 'is-active': String(activeTool) === 'arrow' }" title="Pfeil">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="arrow"
              :checked="String(activeTool) === 'arrow'" @change="() => emit('update-active-tool', 'arrow')" />
            <span class="timeline-tool-icon" aria-hidden="true">➤</span>
          </label>

          <label class="timeline-tool" :class="{ 'is-active': String(activeTool) === 'select' }"
            title="Auswahl-Rechteck">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="select"
              :checked="String(activeTool) === 'select'" @change="() => emit('update-active-tool', 'select')" />
            <span class="timeline-tool-icon" aria-hidden="true">▭</span>
          </label>

          <button class="timeline-tool" type="button" title="Kopieren" @click="() => emit('copy-selection')">
            <span class="timeline-tool-icon" aria-hidden="true">⧉</span>
          </button>

          <button class="timeline-tool" type="button" title="Einfügen" @click="() => emit('paste-at-playhead')">
            <span class="timeline-tool-icon" aria-hidden="true">⎘</span>
          </button>

          <button class="timeline-tool" type="button" title="Undo" @click="() => emit('undo')">
            <span class="timeline-tool-icon" aria-hidden="true">↶</span>
          </button>

          <button class="timeline-tool" type="button" title="Redo" @click="() => emit('redo')">
            <span class="timeline-tool-icon" aria-hidden="true">↷</span>
          </button>
        </div>

        <div ref="scrollEl" class="timeline-scroll" @pointerdown.capture="onMarqueePointerDown"
          @pointermove.capture="onMarqueePointerMove" @pointerup.capture="onMarqueePointerUp"
          @pointercancel.capture="onMarqueePointerUp">
          <div class="timeline-content">
            <div class="strings-timeline">
              <TimelineTrack v-for="track in visibleTracks" :key="track.stringIdx" :string="track.stringIdx"
                :string-label="track.label" :active-string="activeString" :notes="track.notes"
                :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
                :snap-enabled="snapEnabled" :step="currentStep" :beat-top="beatTop" :beat-bottom="beatBottom"
                :sim-group-mode="simGroupMode"
                :track-min-width-px="trackMinWidthPx"
                @update-active-string="(v) => emit('update-active-string', v)"
                @seek-playhead="(t) => emit('seek-playhead', t)" @update-note-grid-index="
                  (key, gridIndex) => emit('update-note-grid-index', key, gridIndex)
                " @update-note-length="
                  (key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)
                " @group-move-notes="
                  (anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)
                " @group-resize-notes="
                  (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                " />
            </div>

            <div v-if="marqueeActive" class="marquee" :style="marqueeStyle" />
          </div>
        </div>
      </div>
    </div>

    <v-card v-if="!compact" class="timeline-status" variant="flat" border>
      <div class="d-flex align-center ga-3 flex-wrap pa-2">
        <v-chip class="status-chip" label variant="tonal" color="primary">
          Zeit: {{ playheadTimeLabel }}
        </v-chip>
        <v-chip class="status-chip" label variant="tonal" color="secondary">
          Takt: {{ barBeatLabel }}
        </v-chip>

        <div class="zoom-status d-flex align-center ga-2">
          <div class="text-caption text-medium-emphasis">Zoom</div>
          <v-slider v-model="zoomLocal" class="zoom-slider" density="compact" hide-details min="12" max="120"
            step="2" />
        </div>
      </div>
    </v-card>

    <div ref="transportEl" class="timeline-transport" aria-label="Transport">
      <div class="timeline-transport-inner">
        <PlaybackControls :is-playing="isPlaying" :tempo="tempo" :loop-enabled="loopEnabled" :playhead="playhead"
          :total-duration="totalDuration" @toggle-play="emit('toggle-play')" @seek-start="emit('seek-start')"
          @seek-playhead="(t) => emit('seek-playhead', t)" @update-tempo="(v) => emit('update-tempo', v)"
          @update-loop="(v) => emit('update-loop', v)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import PlaybackControls from './controls/PlaybackControls.vue'
import ModeSelector from './controls/ModeSelector.vue'
import TimelineTrack from './TimelineTrack.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSelectionStore } from '@/store/useSelection'

const props = defineProps({
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true },

  compact: { type: Boolean, default: false },

  loopEnabled: { type: Boolean, default: false },

  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  soundDurationScale: { type: Number, default: 1 },
  activeString: { type: Number, default: 1 },
  activeTool: { type: String, default: 'arrow' },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },

  numStrings: { type: Number, default: 6 },
  numFrets: { type: Number, default: 12 },

  stringsCollapsed: { type: Boolean, default: false },

  zoomPxPerBlock: { type: Number, default: 50 },

  totalDuration: { type: Number, required: true },
  totalBlocks: { type: Number, required: true },
  playhead: { type: Number, required: true },
  currentStep: { type: Number, required: true },

  tracks: { type: Array, required: true },
  simGroupMode: { type: String, default: '' },
})

const emit = defineEmits([
  'toggle-play',
  'seek-start',
  'update-tempo',
  'update-loop',
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-sound-duration-scale',
  'update-active-string',
  'update-active-tool',
  'update-beat-top',
  'update-beat-bottom',
  'update-num-strings',
  'update-frets',
  'update-strings-collapsed',
  'update-zoom',
  'seek-playhead',
  'update-note-grid-index',
  'update-note-length',
  'group-move-notes',
  'group-resize-notes',
  'copy-selection',
  'paste-at-playhead',
  'undo',
  'redo',
  'update-sim-group-mode',
])

const zoomLocal = computed({
  get: () => props.zoomPxPerBlock,
  set: (v) => emit('update-zoom', Number(v)),
})

const zoomPx = computed(() => Math.max(8, Number(props.zoomPxPerBlock) || 50))

const visibleTracks = computed(() => {
  return Array.isArray(props.tracks) ? props.tracks : []
})

const selection = useSelectionStore()

const transportEl = ref(null)
const transportHeightPx = ref(0)
let transportObserver = null

const timelineMainStyle = computed(() => {
  return {
    '--timeline-transport-h': `${Math.max(0, Number(transportHeightPx.value) || 0)}px`,
  }
})

const scrollEl = ref(null)
const marqueeActive = ref(false)
const marqueeStart = ref({ x: 0, y: 0 })
const marqueeEnd = ref({ x: 0, y: 0 })
let marqueeRaf = 0
let marqueePointerId = null

function toContentCoords(clientX, clientY) {
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return { x: 0, y: 0 }
  const r = el.getBoundingClientRect()
  return {
    x: clientX - r.left + el.scrollLeft,
    y: clientY - r.top + el.scrollTop,
  }
}

function rectFromPoints(a, b) {
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x, b.x)
  const bottom = Math.max(a.y, b.y)
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

const marqueeStyle = computed(() => {
  const r = rectFromPoints(marqueeStart.value, marqueeEnd.value)
  return {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  }
})

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function updateMarqueeSelection() {
  marqueeRaf = 0
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return
  const scrollRect = el.getBoundingClientRect()
  const selRect = rectFromPoints(marqueeStart.value, marqueeEnd.value)

  const nodes = el.querySelectorAll?.('.note-event[data-note-key]')
  if (!nodes?.length) {
    selection.setSelectedNotes([])
    return
  }

  const keys = []
  for (const node of nodes) {
    const key = node?.getAttribute?.('data-note-key')
    if (!key) continue
    const nr = node.getBoundingClientRect()
    const noteRect = {
      left: nr.left - scrollRect.left + el.scrollLeft,
      right: nr.right - scrollRect.left + el.scrollLeft,
      top: nr.top - scrollRect.top + el.scrollTop,
      bottom: nr.bottom - scrollRect.top + el.scrollTop,
    }
    if (intersects(selRect, noteRect)) keys.push(key)
  }
  selection.setSelectedNotes(keys)
}

function scheduleMarqueeUpdate() {
  if (marqueeRaf) return
  marqueeRaf = requestAnimationFrame(updateMarqueeSelection)
}

function onMarqueePointerDown(e) {
  if (String(props.activeTool) !== 'select') return
  if (e?.button != null && e.button !== 0) return
  if (e?.target?.closest?.('button, input, label, a')) return
  if (e?.target?.closest?.('.note-event')) return

  const el = scrollEl.value
  if (!el) return

  marqueePointerId = e.pointerId
  marqueeActive.value = true

  const p = toContentCoords(e.clientX, e.clientY)
  marqueeStart.value = p
  marqueeEnd.value = p
  selection.setSelectedNotes([])

  el.setPointerCapture?.(e.pointerId)
  e.preventDefault()
  e.stopPropagation()
}

function onMarqueePointerMove(e) {
  if (!marqueeActive.value) return
  if (marqueePointerId != null && e.pointerId !== marqueePointerId) return
  const p = toContentCoords(e.clientX, e.clientY)
  marqueeEnd.value = p
  scheduleMarqueeUpdate()
  e.preventDefault()
  e.stopPropagation()
}

function onMarqueePointerUp(e) {
  if (!marqueeActive.value) return
  if (marqueePointerId != null && e.pointerId !== marqueePointerId) return
  marqueeActive.value = false
  marqueePointerId = null
  if (marqueeRaf) {
    cancelAnimationFrame(marqueeRaf)
    marqueeRaf = 0
    updateMarqueeSelection()
  }
  e?.preventDefault?.()
  e?.stopPropagation?.()
}

onBeforeUnmount(() => {
  if (marqueeRaf) cancelAnimationFrame(marqueeRaf)

  if (transportObserver) {
    transportObserver.disconnect?.()
    transportObserver = null
  }
})

onMounted(() => {
  const el = transportEl.value
  if (!el) return

  // Keep the bottom padding in sync with the fixed transport height.
  if (typeof ResizeObserver !== 'undefined') {
    transportObserver = new ResizeObserver((entries) => {
      const entry = entries?.[0]
      const h = entry?.contentRect?.height
      transportHeightPx.value = Number.isFinite(h) ? h : (el.getBoundingClientRect?.().height ?? 0)
    })
    transportObserver.observe(el)
  } else {
    transportHeightPx.value = el.getBoundingClientRect?.().height ?? 0
  }
})

const trackMinWidthPx = computed(() => {
  const blocks = Math.max(1, Number(props.totalBlocks) || 1)
  return blocks * zoomPx.value
})

const timePerBlockMs = computed(() => {
  const total = Number(props.totalDuration) || 0
  const blocks = Number(props.totalBlocks) || 0
  if (!(total > 0) || !(blocks > 0)) return 0
  return total / blocks
})

function formatMs(tMs) {
  const ms = Math.max(0, Number(tMs) || 0)
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const hundredths = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 100)

  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  const hh = String(hundredths).padStart(2, '0')
  return `${mm}:${ss}.${hh}`
}

const playheadTimeLabel = computed(() => formatMs(props.playhead))

const barBeatLabel = computed(() => {
  const beatsPerBarRaw = Number.parseInt(String(props.beatTop), 10)
  const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 1

  const tpb = timePerBlockMs.value
  if (!(tpb > 0)) return '1|1'

  const totalBlocks = Math.max(1, Number(props.totalBlocks) || 1)
  const blocksRaw = (Number(props.playhead) || 0) / tpb
  // If we're exactly at the end, show the last bar (not "one past").
  const blocks = Math.min(totalBlocks - 1e-9, Math.max(0, blocksRaw))
  const blockIndex = Math.floor(blocks)
  const bar = Math.floor(blockIndex / beatsPerBar) + 1
  const beat = (blockIndex % beatsPerBar) + 1
  return `${bar}|${beat}`
})
</script>

<style scoped>
.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: calc(var(--timeline-transport-h, 0px) + 15px);
}

.timeline-transport {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  padding: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  pointer-events: none;
}

.timeline-transport-inner {
  width: 100%;
  max-width: none;
  pointer-events: auto;
}

.timeline {
  position: relative;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow: hidden;
}

.timeline.is-collapsed :deep(.timeline-track) {
  /* Collapse height to one third of the normal row height (44px). */
  height: calc(44px / 3);
}

.timeline.is-collapsed :deep(.note-label) {
  display: none;
}

.timeline-scroll {
  flex: 1 1 auto;
  overflow-x: auto;
  overflow-y: hidden;
}

.timeline-columns {
  display: flex;
  width: 100%;
}

.timeline-tools {
  flex: 0 0 76px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  background: #f0f0f0;
  border-right: 1px solid #ddd;
}

.timeline-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  user-select: none;
  padding: 0;
}

.timeline-tool:hover {
  background: #fff;
}

.timeline-tool.is-active {
  border-color: #666;
  background: #fff;
}

.timeline-tool-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.timeline-tool-icon {
  font-size: 26px;
  line-height: 1;
  opacity: 0.8;
}

.timeline-tool.is-active .timeline-tool-icon {
  opacity: 1;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  position: relative;
}

.strings-timeline {
  position: relative;
}

.timeline-status {
  background: #fff;
}

.status-chip {
  width: 200px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
}

.zoom-status {
  min-width: 320px;
}

.zoom-slider {
  width: 240px;
  max-width: 40vw;
}

.marquee {
  position: absolute;
  border: 2px dashed rgba(102, 126, 234, 0.95);
  background: rgba(102, 126, 234, 0.12);
  border-radius: 6px;
  pointer-events: none;
  z-index: 20;
}
</style>
