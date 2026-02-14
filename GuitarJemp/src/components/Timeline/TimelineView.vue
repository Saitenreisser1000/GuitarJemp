<template>
  <div class="timeline-main" :style="timelineMainStyle">
    <div v-if="countInVisible" class="count-in-lightbox" aria-live="polite" aria-atomic="true">
      <div class="count-in-value">{{ countInBeat }}</div>
    </div>

    <div class="timeline-layout">
      <aside class="main-menu-rail" aria-label="Hauptmenü">
        <ModeSelector :selected-mode="selectedMode" :snap-enabled="snapEnabled"
          :sound-preview-enabled="soundPreviewEnabled"
          :sound-duration-scale="soundDurationScale" :beat-top="beatTop"
          :beat-bottom="beatBottom" :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats"
          :num-strings="numStrings" :num-frets="numFrets" :strings-collapsed="stringsCollapsed"
          :sim-group-mode="simGroupMode" :timeline-visible="timelineVisible" :active-notes-visible="activeNotesVisible"
          :library-enabled="libraryEnabled" :is-dark-theme="isDarkTheme"
          @update-sim-group-mode="(v) => emit('update-sim-group-mode', v)"
          @update-timeline-visible="(v) => (timelineVisible = Boolean(v))"
          @update-active-notes-visible="(v) => emit('update-active-notes-visible', Boolean(v))"
          @open-library="emit('open-library')"
          @toggle-theme="emit('toggle-theme')"
          @undo="emit('undo')"
          @redo="emit('redo')"
          @update-mode="(v) => emit('update-mode', v)" @update-snap="(v) => emit('update-snap', v)"
          @update-sound-preview="(v) => emit('update-sound-preview', v)"
          @update-sound-duration-scale="(v) => emit('update-sound-duration-scale', v)"
          @update-beat-top="(v) => emit('update-beat-top', v)" @update-beat-bottom="(v) => emit('update-beat-bottom', v)"
          @update-pickup-enabled="(v) => emit('update-pickup-enabled', v)"
          @update-pickup-beats="(v) => emit('update-pickup-beats', v)"
          @update-num-strings="(v) => emit('update-num-strings', v)" @update-frets="(v) => emit('update-frets', v)"
          @update-strings-collapsed="(v) => emit('update-strings-collapsed', v)" />
      </aside>

      <section class="timeline-body" aria-label="Timeline Hauptbereich">
        <div v-if="timelineVisible" class="timeline ui-panel" :class="{ 'is-collapsed': stringsCollapsed }">
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
            </div>

            <div ref="scrollEl" class="timeline-scroll" @pointerdown.capture="onMarqueePointerDown"
              @pointermove.capture="onMarqueePointerMove" @pointerup.capture="onMarqueePointerUp"
              @pointercancel.capture="onMarqueePointerUp">
              <div class="timeline-content">
                <div v-if="loopEnabled" class="loop-bracket-layer">
                  <div class="loop-bracket" :style="loopBracketStyle">
                    <button
                      class="loop-handle loop-handle-start"
                      type="button"
                      title="Loopstart ziehen"
                      @pointerdown="onLoopHandlePointerDown('start', $event)"
                    />
                    <div class="loop-bracket-bar" />
                    <button
                      class="loop-handle loop-handle-end"
                      type="button"
                      title="Loopende ziehen"
                      @pointerdown="onLoopHandlePointerDown('end', $event)"
                    />
                  </div>
                </div>

                <div class="strings-timeline">
                  <TimelineTrack :string="0" string-label="HandPosition" :active-string="activeString"
                    :notes="handPositionNotes"
                    :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
                    :snap-enabled="snapEnabled" :step="currentStep" :beat-top="beatTop" :beat-bottom="beatBottom"
                    :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats"
                    :sim-group-mode="simGroupMode" :track-min-width-px="trackMinWidthPx" :is-aux-track="true"
                    @add-aux-item="() => emit('add-hand-position')" @seek-playhead="(t) => emit('seek-playhead', t)"
                    @update-note-grid-index="(key, gridIndex) => emit('update-note-grid-index', key, gridIndex)"
                    @update-note-length="(key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)"
                    @update-note-label="(key, label) => emit('update-note-label', key, label)"
                    @group-move-notes="(anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)"
                    @group-resize-notes="
                      (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                    " />

                  <TimelineTrack v-for="track in visibleTracks" :key="track.stringIdx" :string="track.stringIdx"
                    :string-label="track.label" :active-string="activeString" :notes="track.notes"
                    :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
                    :snap-enabled="snapEnabled" :step="currentStep" :beat-top="beatTop" :beat-bottom="beatBottom"
                    :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats"
                    :sim-group-mode="simGroupMode" :track-min-width-px="trackMinWidthPx"
                    @update-active-string="(v) => emit('update-active-string', v)"
                    @seek-playhead="(t) => emit('seek-playhead', t)" @update-note-grid-index="
                      (key, gridIndex) => emit('update-note-grid-index', key, gridIndex)
                    " @update-note-length="
                      (key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)
                    " @update-note-label="
                      (key, label) => emit('update-note-label', key, label)
                    " @group-move-notes="
                      (anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)
                    " @group-resize-notes="
                      (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                    " />
                </div>

                <div
                  class="timeline-length-handle-wrap"
                  :style="{ left: `${trackEndPx}px` }"
                >
                  <div class="timeline-length-marker" aria-hidden="true">
                    <span class="timeline-length-marker-thin" />
                    <span class="timeline-length-marker-thick" />
                  </div>
                  <button
                    class="timeline-length-handle"
                    type="button"
                    title="Timeline-Länge ziehen"
                    aria-label="Timeline-Länge ziehen"
                    @pointerdown="onLengthHandlePointerDown"
                  >
                    <span class="timeline-length-handle-grip" aria-hidden="true">⋮⋮</span>
                  </button>
                </div>

                <div v-if="marqueeActive" class="marquee" :style="marqueeStyle" />
              </div>
            </div>
          </div>
        </div>

        <v-card v-if="timelineVisible" class="timeline-info ui-panel" variant="flat">
          <div class="d-flex align-center ga-3 flex-wrap pa-2">
            <v-chip class="status-chip" label variant="tonal" color="primary">
              Zeit: {{ playheadTimeLabel }}
            </v-chip>
            <v-chip class="status-chip" label variant="tonal" color="secondary">
              Takt: {{ barBeatLabel }}
            </v-chip>

            <div class="zoom-status d-flex align-center ga-2">
              <div class="text-caption zoom-label">Zoom</div>
              <v-slider v-model="zoomLocal" class="zoom-slider" density="compact" hide-details min="12" max="120"
                step="2" />
            </div>
          </div>
        </v-card>
      </section>
    </div>

    <div ref="transportEl" class="timeline-transport" aria-label="Transport">
      <div class="timeline-transport-inner">
        <PlaybackControls :is-playing="isPlaying" :tempo="tempo" :click-enabled="clickEnabled" :loop-enabled="loopEnabled" :playhead="playhead"
          :total-duration="totalDuration" @toggle-play="emit('toggle-play')" @seek-start="emit('seek-start')"
          @seek-playhead="(t) => emit('seek-playhead', t)" @update-tempo="(v) => emit('update-tempo', v)"
          @update-click="(v) => emit('update-click', v)"
          @update-loop="(v) => emit('update-loop', v)" />
      </div>
    </div>
  </div>
</template>

<script setup>
import PlaybackControls from './controls/PlaybackControls.vue'
import ModeSelector from './controls/ModeSelector.vue'
import TimelineTrack from './TimelineTrack.vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useSelectionStore } from '@/store/useSelection'

const props = defineProps({
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true },

  compact: { type: Boolean, default: false },

  loopEnabled: { type: Boolean, default: false },
  loopStartBlock: { type: Number, default: 0 },
  loopEndBlock: { type: Number, default: 0 },

  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  clickEnabled: { type: Boolean, default: false },
  countInVisible: { type: Boolean, default: false },
  countInBeat: { type: Number, default: 0 },
  soundDurationScale: { type: Number, default: 1 },
  activeString: { type: Number, default: 1 },
  activeTool: { type: String, default: 'arrow' },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 1 },

  numStrings: { type: Number, default: 6 },
  numFrets: { type: Number, default: 12 },

  stringsCollapsed: { type: Boolean, default: false },

  zoomPxPerBlock: { type: Number, default: 50 },

  totalDuration: { type: Number, required: true },
  totalBlocks: { type: Number, required: true },
  playhead: { type: Number, required: true },
  currentStep: { type: Number, required: true },

  tracks: { type: Array, required: true },
  handPositionNotes: { type: Array, default: () => [] },
  simGroupMode: { type: String, default: '' },
  activeNotesVisible: { type: Boolean, default: true },
  libraryEnabled: { type: Boolean, default: true },
  isDarkTheme: { type: Boolean, default: false },
})

const emit = defineEmits([
  'toggle-play',
  'seek-start',
  'update-tempo',
  'update-loop',
  'update-loop-start-block',
  'update-loop-end-block',
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-click',
  'update-sound-duration-scale',
  'update-active-string',
  'update-active-tool',
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'update-num-strings',
  'update-frets',
  'update-strings-collapsed',
  'update-zoom',
  'seek-playhead',
  'update-note-grid-index',
  'update-note-length',
  'update-note-label',
  'group-move-notes',
  'group-resize-notes',
  'add-hand-position',
  'copy-selection',
  'paste-at-playhead',
  'undo',
  'redo',
  'update-sim-group-mode',
  'update-active-notes-visible',
  'open-library',
  'toggle-theme',
  'update-total-blocks',
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
const timelineVisible = ref(true)
const marqueeActive = ref(false)
const marqueeStart = ref({ x: 0, y: 0 })
const marqueeEnd = ref({ x: 0, y: 0 })
let marqueeRaf = 0
let marqueePointerId = null
const lengthDrag = ref({
  active: false,
  pointerId: null,
  startClientX: 0,
  startBlocks: 0,
})
const loopDrag = ref({
  active: false,
  kind: '',
  pointerId: null,
})

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
  if (e?.target?.closest?.('.timeline-length-handle-wrap')) return
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

function onLengthHandlePointerDown(e) {
  if (e?.button != null && e.button !== 0) return
  const target = e?.currentTarget
  const pointerId = e?.pointerId
  if (pointerId == null) return

  lengthDrag.value = {
    active: true,
    pointerId,
    startClientX: Number(e?.clientX) || 0,
    startBlocks: Math.max(1, Number(props.totalBlocks) || 1),
  }

  target?.setPointerCapture?.(pointerId)
  target?.addEventListener?.('pointermove', onLengthHandlePointerMove)
  target?.addEventListener?.('pointerup', onLengthHandlePointerUp)
  target?.addEventListener?.('pointercancel', onLengthHandlePointerUp)
  e.preventDefault()
  e.stopPropagation()
}

function onLengthHandlePointerMove(e) {
  const drag = lengthDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const dx = (Number(e?.clientX) || 0) - drag.startClientX
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const deltaBlocks = dx / zoom
  const rawNext = Math.max(1, drag.startBlocks + deltaBlocks)
  // Drag should feel fluid: update freely and only snap on pointerup.
  emit('update-total-blocks', Number(rawNext.toFixed(3)))
  e.preventDefault()
  e.stopPropagation()
}

function onLengthHandlePointerUp(e) {
  const drag = lengthDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const dx = (Number(e?.clientX) || 0) - drag.startClientX
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const deltaBlocks = dx / zoom
  const rawNext = Math.max(1, drag.startBlocks + deltaBlocks)
  const raster = Math.max(0.01, Number(props.currentStep) || 1)
  const snapped = Math.round(rawNext / raster) * raster
  emit('update-total-blocks', Number(snapped.toFixed(3)))

  const target = e?.currentTarget
  target?.removeEventListener?.('pointermove', onLengthHandlePointerMove)
  target?.removeEventListener?.('pointerup', onLengthHandlePointerUp)
  target?.removeEventListener?.('pointercancel', onLengthHandlePointerUp)

  lengthDrag.value = {
    active: false,
    pointerId: null,
    startClientX: 0,
    startBlocks: 0,
  }
  e?.preventDefault?.()
  e?.stopPropagation?.()
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

const loopRange = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const step = Math.max(0.01, Number(props.currentStep) || 1)
  const startRaw = Number(props.loopStartBlock)
  const start = Number.isFinite(startRaw) ? clamp(startRaw, 0, total - step) : 0
  const endRaw = Number(props.loopEndBlock)
  const endCandidate = Number.isFinite(endRaw) && endRaw > 0 ? endRaw : total
  const end = clamp(endCandidate, start + step, total)
  return { start, end, total, step }
})

const loopBracketStyle = computed(() => {
  const labelWidthPx = 48
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const startPx = labelWidthPx + loopRange.value.start * zoom
  const endPx = labelWidthPx + loopRange.value.end * zoom
  return {
    left: `${startPx}px`,
    width: `${Math.max(6, endPx - startPx)}px`,
  }
})

function blockFromPointerEvent(e) {
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return 0
  const rect = el.getBoundingClientRect()
  const x = Number(e?.clientX) - rect.left + el.scrollLeft
  const labelWidthPx = 48
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const raw = (x - labelWidthPx) / zoom
  const step = Math.max(0.01, Number(props.currentStep) || 1)
  return Math.round(raw / step) * step
}

function onLoopHandlePointerDown(kind, e) {
  if (!props.loopEnabled) return
  const pointerId = e?.pointerId
  if (pointerId == null) return
  const target = e?.currentTarget
  loopDrag.value = { active: true, kind: String(kind), pointerId }
  target?.setPointerCapture?.(pointerId)
  target?.addEventListener?.('pointermove', onLoopHandlePointerMove)
  target?.addEventListener?.('pointerup', onLoopHandlePointerUp)
  target?.addEventListener?.('pointercancel', onLoopHandlePointerUp)
  e.preventDefault()
  e.stopPropagation()
}

function onLoopHandlePointerMove(e) {
  const drag = loopDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const total = loopRange.value.total
  const step = loopRange.value.step
  const block = clamp(blockFromPointerEvent(e), 0, total)

  if (drag.kind === 'start') {
    const nextStart = clamp(block, 0, loopRange.value.end - step)
    emit('update-loop-start-block', Number(nextStart.toFixed(4)))
  } else if (drag.kind === 'end') {
    const nextEnd = clamp(block, loopRange.value.start + step, total)
    emit('update-loop-end-block', Number(nextEnd.toFixed(4)))
  }
  e.preventDefault()
  e.stopPropagation()
}

function onLoopHandlePointerUp(e) {
  const drag = loopDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return
  const target = e?.currentTarget
  target?.removeEventListener?.('pointermove', onLoopHandlePointerMove)
  target?.removeEventListener?.('pointerup', onLoopHandlePointerUp)
  target?.removeEventListener?.('pointercancel', onLoopHandlePointerUp)
  loopDrag.value = { active: false, kind: '', pointerId: null }
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

const trackEndPx = computed(() => {
  const labelWidthPx = 48
  return trackMinWidthPx.value + labelWidthPx
})

watch(
  () => [props.playhead, props.isPlaying, props.totalDuration, props.totalBlocks, zoomPx.value],
  () => {
    if (!props.isPlaying) return
    const el = scrollEl.value
    if (!el) return

    const totalDurationMs = Number(props.totalDuration) || 0
    const totalBlocksSafe = Math.max(1, Number(props.totalBlocks) || 1)
    if (!(totalDurationMs > 0)) return

    const timePerBlock = totalDurationMs / totalBlocksSafe
    if (!(timePerBlock > 0)) return

    const labelWidthPx = 48
    const playheadBlocks = Math.max(0, Number(props.playhead) || 0) / timePerBlock
    const playheadPx = labelWidthPx + playheadBlocks * zoomPx.value

    const viewportWidth = Math.max(1, el.clientWidth || 0)
    const midpointX = el.scrollLeft + viewportWidth / 2
    if (playheadPx < midpointX) return

    const maxScrollLeft = Math.max(0, el.scrollWidth - viewportWidth)
    const targetScrollLeft = Math.min(maxScrollLeft, Math.max(0, playheadPx - viewportWidth / 2))
    if (targetScrollLeft <= el.scrollLeft + 0.5) return
    el.scrollLeft = targetScrollLeft
  },
  { flush: 'post' },
)

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
  const beatBottom = Number.parseInt(String(props.beatBottom), 10)
  const blocksPerBeat = 4 / ([1, 2, 4, 8].includes(beatBottom) ? beatBottom : 4)
  const blocksPerBar = beatsPerBar * blocksPerBeat
  const pickupOn = Boolean(props.pickupEnabled)
  const rawPickupBeats = Number.parseInt(String(props.pickupBeats), 10)
  const pickupBeats = Number.isFinite(rawPickupBeats)
    ? Math.max(1, Math.min(Math.max(1, beatsPerBar - 1), Math.min(9, rawPickupBeats)))
    : 1
  const pickupBlocks = pickupOn ? pickupBeats * blocksPerBeat : 0

  let bar = 1
  let beat = 1
  if (pickupOn && pickupBlocks > 0 && blocks < pickupBlocks) {
    bar = 0
    beat = Math.floor(blocks / blocksPerBeat) + 1
  } else {
    const shifted = pickupOn ? blocks - pickupBlocks : blocks
    const blockIndex = Math.floor(Math.max(0, shifted))
    bar = Math.floor(blockIndex / blocksPerBar) + 1
    beat = Math.floor((blockIndex % blocksPerBar) / blocksPerBeat) + 1
  }
  return `${bar}|${beat}`
})
</script>

<style scoped>
.timeline-main {
  --main-menu-w: 84px;
  --main-menu-v-pad: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-1);
}

.count-in-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, #000 38%, transparent);
  backdrop-filter: blur(2px);
  pointer-events: none;
}

.count-in-value {
  min-width: 132px;
  height: 132px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--color-primary) 75%, #fff 25%);
  background: color-mix(in srgb, var(--color-surface) 86%, var(--color-surface-2) 14%);
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 4rem;
  font-weight: 800;
  line-height: 132px;
  text-align: center;
  box-shadow: 0 14px 40px rgb(0 0 0 / 30%);
}

.timeline-layout {
  display: block;
}

.main-menu-rail {
  position: fixed;
  left: 0;
  top: var(--v-layout-top, 0px);
  bottom: 0;
  width: var(--main-menu-w);
  z-index: 25;
  padding: var(--main-menu-v-pad) var(--space-2);
}

.main-menu-rail :deep(.main-menu-shell) {
  height: calc(
    100vh - var(--v-layout-top, 0px) - (2 * var(--main-menu-v-pad))
  );
}

.timeline-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.timeline-transport {
  position: fixed;
  left: calc(var(--main-menu-w) + var(--space-4));
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: color-mix(in srgb, var(--color-surface) 90%, var(--color-surface-2) 10%);
  box-shadow: var(--elev-2);
  overflow: clip;
  pointer-events: auto;
}

.timeline {
  position: relative;
  background: color-mix(in srgb, var(--color-surface) 93%, var(--color-surface-2) 7%);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
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
  flex: 0 0 38px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px;
  background: color-mix(in srgb, var(--color-surface-2) 82%, var(--color-surface) 18%);
  border-right: 1px solid var(--color-border);
}

.timeline-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  user-select: none;
  padding: 0;
  transition: border-color var(--ui-fast), box-shadow var(--ui-fast), background-color var(--ui-fast), transform var(--ui-fast);
}

.timeline-tool:hover {
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-primary) 12%);
}

.timeline-tool.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 16%, var(--color-surface) 84%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 68%, transparent);
}

.timeline-tool-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.timeline-tool-icon {
  font-size: 15px;
  line-height: 1;
  opacity: 0.85;
  color: var(--color-text-muted);
}

.timeline-tool.is-active .timeline-tool-icon {
  opacity: 1;
  color: var(--color-text);
}

.timeline-content {
  display: flex;
  flex-direction: column;
  position: relative;
}

.loop-bracket-layer {
  position: relative;
  height: 16px;
  margin-bottom: 2px;
}

.loop-bracket {
  position: absolute;
  top: 2px;
  height: 12px;
  display: flex;
  align-items: center;
  z-index: 16;
}

.loop-bracket-bar {
  flex: 1;
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 70%, var(--color-surface) 30%);
}

.loop-handle {
  width: 8px;
  height: 12px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: color-mix(in srgb, var(--color-surface-2) 80%, var(--color-surface) 20%);
  cursor: ew-resize;
  padding: 0;
}

.loop-handle-start {
  margin-right: 2px;
}

.loop-handle-end {
  margin-left: 2px;
}

.strings-timeline {
  position: relative;
}

.timeline-length-handle-wrap {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 0;
  display: flex;
  pointer-events: none;
  z-index: 15;
}

.timeline-length-marker {
  position: absolute;
  left: -7px;
  top: 0;
  bottom: 0;
  width: 6px;
  display: flex;
  align-items: stretch;
  gap: 2px;
  opacity: 0.95;
  z-index: 3;
  pointer-events: none;
}

.timeline-length-marker-thin {
  width: 1px;
  background: #000;
}

.timeline-length-marker-thick {
  width: 3px;
  background: #000;
}

.timeline-length-handle {
  pointer-events: auto;
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
  width: 28px;
  z-index: 2;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--color-surface-2) 72%, var(--color-surface) 28%);
  color: var(--color-text-muted);
  cursor: ew-resize;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: background-color var(--ui-fast), border-color var(--ui-fast), color var(--ui-fast);
}

.timeline-length-handle::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -10px;
  right: -10px;
}

.timeline-length-handle:hover {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 18%, var(--color-surface) 82%);
  color: var(--color-text);
}

.timeline-length-handle:active {
  background: color-mix(in srgb, var(--color-primary) 26%, var(--color-surface) 74%);
}

.timeline-length-handle-grip {
  font-size: 11px;
  line-height: 1;
  letter-spacing: -0.05em;
  user-select: none;
}

.timeline-info {
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.status-chip {
  width: 200px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.zoom-status {
  min-width: 320px;
}

.zoom-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.zoom-slider {
  width: 240px;
  max-width: 40vw;
}

.timeline-info :deep(.v-slider-track__background) {
  opacity: 1;
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface-2));
}

.timeline-info :deep(.v-slider-track__fill) {
  background: var(--color-primary);
}

.timeline-info :deep(.v-slider-thumb__surface) {
  border: 2px solid color-mix(in srgb, var(--color-primary) 70%, var(--color-surface));
  box-shadow: 0 1px 7px rgb(0 0 0 / 22%);
}

.marquee {
  position: absolute;
  border: 2px dashed var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 16%, transparent);
  border-radius: 6px;
  pointer-events: none;
  z-index: 20;
}

@media (max-width: 860px) {
  .timeline-layout {
    display: block;
  }

  .main-menu-rail {
    position: static;
    width: auto;
    height: auto;
    padding: 0;
  }

  .main-menu-rail :deep(.main-menu-shell) {
    height: auto;
  }

  .timeline-body {
    min-width: 0;
  }

  .timeline-transport {
    left: 0;
  }

  .status-chip {
    width: auto;
    min-width: 132px;
  }

  .zoom-status {
    min-width: 100%;
  }

  .zoom-slider {
    width: 100%;
    max-width: none;
  }
}
</style>
