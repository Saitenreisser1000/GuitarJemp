<template>
  <div class="timeline-main" :style="timelineMainStyle">
    <div v-if="countInVisible" class="count-in-lightbox" aria-live="polite" aria-atomic="true">
      <div class="count-in-value">{{ countInBeat }}</div>
    </div>

    <div class="timeline-layout">
      <section class="timeline-body" :aria-label="t('timelineView.mainArea')">
        <div class="timeline-top-row">
          <div v-if="transportVisible || timelineVisible" class="timeline-collapse-btn-wrap">
            <v-btn size="x-small" variant="tonal" :title="timelineVisible ? 'Collapse' : 'Expand'" :prepend-icon="timelineVisible ? 'mdi-unfold-less-horizontal' : 'mdi-unfold-more-horizontal'
              " @click="emit('update-timeline-visible', !timelineVisible)">
              {{ timelineVisible ? 'Collapse' : 'Expand' }}
            </v-btn>
          </div>
          <div v-if="transportVisible || timelineVisible" class="timeline-options-btn-wrap">
            <div v-if="timelineVisible" class="timeline-top-zoom d-flex align-center ga-1">
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom -'" @click="incrementZoom">
                &lt;
              </v-btn>
              <div class="text-caption zoom-value">zoom</div>
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom +'" @click="decrementZoom">
                &gt;
              </v-btn>
            </div>
            <v-menu location="bottom end" :close-on-content-click="false">
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="timeline-options-btn"
                  :title="t('modeSelector.options')">
                  <v-icon icon="mdi-cog-outline" size="16" />
                </v-btn>
              </template>

              <v-card class="pa-3 d-flex flex-column ga-2" min-width="220" variant="flat" border>
                <div class="text-caption zoom-label">{{ t('modeSelector.beat') }}</div>
                <div class="d-flex ga-2">
                  <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 84px"
                    :model-value="beatTop" @update:model-value="updateBeatTopFromOptions" />
                  <v-select density="compact" hide-details style="width: 84px" :items="beatBottomItems"
                    :model-value="beatBottom" @update:model-value="updateBeatBottomFromOptions" />
                </div>
                <div class="d-flex align-center ga-2">
                  <v-switch density="compact" hide-details inset :label="t('modeSelector.pickup')"
                    :model-value="pickupEnabled"
                    @update:model-value="(v) => emit('update-pickup-enabled', Boolean(v))" />
                  <v-text-field density="compact" hide-details type="number" min="1" :max="pickupMax" step="1"
                    style="width: 84px" :label="t('modeSelector.beats')" :disabled="!pickupEnabled"
                    :model-value="pickupBeats" @update:model-value="updatePickupBeatsFromOptions" />
                </div>
                <v-switch density="compact" hide-details inset :label="t('modeSelector.snap')"
                  :model-value="snapEnabled" @update:model-value="(v) => emit('update-snap', Boolean(v))" />
                <v-switch density="compact" hide-details inset :label="t('modeSelector.collapseStrings')"
                  :model-value="stringsCollapsed"
                  @update:model-value="(v) => emit('update-strings-collapsed', Boolean(v))" />
              </v-card>
            </v-menu>
          </div>
        </div>
        <div v-if="timelineVisible || transportVisible" class="timeline ui-panel"
          :class="{ 'is-collapsed': stringsCollapsed }">
          <div v-if="timelineVisible" class="timeline-columns">
            <div v-if="!stringsCollapsed" class="timeline-string-names timeline-column-card"
              :aria-label="t('timelineView.strings')">
              <div v-if="loopEnabled" class="timeline-string-names-spacer" />
              <div v-if="markerItems.length" class="timeline-string-names-spacer" />

              <div v-if="handPositionVisible" class="timeline-string-name timeline-string-name-aux">
                <button class="timeline-string-name-btn" type="button" :title="t('timelineView.handPosition')"
                  @click="() => emit('add-hand-position')">
                  ✋+
                </button>
              </div>

              <button v-for="track in visibleTracks" :key="`string-name-${track.stringIdx}`"
                class="timeline-string-name timeline-string-name-btn"
                :class="{ 'is-active': Number(activeString) === Number(track.stringIdx) }" type="button"
                :title="track.label" @click="() => emit('update-active-string', track.stringIdx)">
                {{ track.label }}
              </button>
            </div>

            <div class="timeline-scroll timeline-column-card">
              <div ref="scrollEl" class="timeline-scroll-viewport" @wheel="onTimelineWheel"
                @pointerdown.capture="onMarqueePointerDown" @pointermove.capture="onMarqueePointerMove"
                @pointerup.capture="onMarqueePointerUp" @pointercancel.capture="onMarqueePointerUp">
                <div class="timeline-content">
                <div v-if="loopEnabled" class="loop-bracket-layer">
                  <div class="loop-bracket" :style="loopBracketStyle">
                    <button class="loop-handle loop-handle-start" type="button" :title="t('timelineView.dragLoopStart')"
                      @pointerdown="onLoopHandlePointerDown('start', $event)" />
                    <div class="loop-bracket-bar" />
                    <button class="loop-handle loop-handle-end" type="button" :title="t('timelineView.dragLoopEnd')"
                      @pointerdown="onLoopHandlePointerDown('end', $event)" />
                  </div>
                </div>

                <div v-if="markerItems.length" class="marker-layer" :aria-label="t('timelineView.markers')">
                  <button v-for="marker in markerItems" :key="marker.id" class="timeline-marker" type="button"
                    :style="{ left: `${marker.leftPx}px` }" :title="marker.title"
                    @click="() => emit('seek-playhead', marker.timeMs)">
                    <span class="timeline-marker-label">{{ marker.label }}</span>
                  </button>
                </div>

                <div class="strings-timeline">
                  <TimelineTrack v-if="handPositionVisible" :string="0" :string-label="t('timelineView.handPosition')"
                    :active-string="activeString" :notes="handPositionNotes" :total-duration="totalDuration"
                    :total-blocks="totalBlocks" :playhead="playhead" :snap-enabled="snapEnabled" :step="currentStep"
                    :beat-top="beatTop" :beat-bottom="beatBottom" :pickup-enabled="pickupEnabled"
                    :pickup-beats="pickupBeats" :sim-group-mode="simGroupMode" :track-min-width-px="trackMinWidthPx"
                    :ghost-notes-enabled="ghostNotesEnabled" :is-aux-track="true"
                    :show-bar-numbers="showBarNumbersOnAuxTrack" @add-aux-item="() => emit('add-hand-position')"
                    @seek-playhead="(t) => emit('seek-playhead', t)" @update-note-grid-index="
                      (key, gridIndex) => emit('update-note-grid-index', key, gridIndex)
                    " @update-note-length="
                      (key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)
                    " @update-note-label="(key, label) => emit('update-note-label', key, label)" @group-move-notes="
                      (anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)
                    " @group-resize-notes="
                      (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                    " />

                  <TimelineTrack v-for="track in visibleTracks" :key="track.stringIdx" :string="track.stringIdx"
                    :string-label="track.label" :active-string="activeString" :notes="track.notes"
                    :total-duration="totalDuration" :total-blocks="totalBlocks" :playhead="playhead"
                    :snap-enabled="snapEnabled" :step="currentStep" :beat-top="beatTop" :beat-bottom="beatBottom"
                    :pickup-enabled="pickupEnabled" :pickup-beats="pickupBeats" :sim-group-mode="simGroupMode"
                    :track-min-width-px="trackMinWidthPx" :ghost-notes-enabled="ghostNotesEnabled"
                    :show-bar-numbers="!handPositionVisible && isFirstVisibleTrack(track)"
                    @update-active-string="(v) => emit('update-active-string', v)"
                    @seek-playhead="(t) => emit('seek-playhead', t)" @update-note-grid-index="
                      (key, gridIndex) => emit('update-note-grid-index', key, gridIndex)
                    " @update-note-length="
                      (key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)
                    " @update-note-label="(key, label) => emit('update-note-label', key, label)" @group-move-notes="
                      (anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)
                    " @group-resize-notes="
                      (anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)
                    " />
                </div>

                <div class="timeline-length-handle-wrap" :style="{ left: `${trackEndPx}px` }">
                  <div class="timeline-length-marker" :title="t('timelineView.dragTimelineLength')"
                    :aria-label="t('timelineView.dragTimelineLength')" @pointerdown="onLengthHandlePointerDown">
                    <span class="timeline-length-marker-thin" />
                    <span class="timeline-length-marker-thick" />
                  </div>
                </div>

                  <div v-if="marqueeActive" class="marquee" :style="marqueeStyle" />
                </div>
              </div>
            </div>
          </div>
          <v-card v-if="timelineVisible" class="timeline-info ui-panel" variant="flat">
            <div class="d-flex align-center ga-2 flex-wrap pa-1">
              <div class="timeline-info-tools d-flex align-center ga-2" :aria-label="t('timelineView.tools')">
                <label class="timeline-tool" :class="{ 'is-active': String(activeTool) === 'arrow' }"
                  :title="t('timelineView.arrow')">
                  <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="arrow"
                    :checked="String(activeTool) === 'arrow'" @change="() => emit('update-active-tool', 'arrow')" />
                  <span class="timeline-tool-icon" aria-hidden="true">➤</span>
                </label>

                <label class="timeline-tool" :class="{ 'is-active': String(activeTool) === 'select' }"
                  :title="t('timelineView.selectionRect')">
                  <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="select"
                    :checked="String(activeTool) === 'select'" @change="() => emit('update-active-tool', 'select')" />
                  <span class="timeline-tool-icon" aria-hidden="true">▭</span>
                </label>

                <button class="timeline-tool" type="button" :title="t('timelineView.copy')"
                  @click="() => emit('copy-selection')">
                  <span class="timeline-tool-icon" aria-hidden="true">⧉</span>
                </button>

                <button class="timeline-tool" type="button" :title="t('timelineView.paste')"
                  @click="() => emit('paste-at-playhead')">
                  <span class="timeline-tool-icon" aria-hidden="true">⎘</span>
                </button>

                <button class="timeline-tool timeline-tool-text" type="button" :title="t('timelineView.loopToSelection')"
                  @click="() => emit('loop-to-selection')">
                  {{ t('playback.loop') }}
                </button>
              </div>

              <div class="bars-input-wrap d-flex align-center ga-2 ms-auto">
                <div class="text-caption zoom-label">Bars:</div>
                <v-text-field class="bars-count-input" density="compact" hide-details variant="outlined" type="number"
                  min="1" step="1" :model-value="barsNoPickupLocal"
                  @update:model-value="(v) => (barsNoPickupLocal = v)" />
                <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars -1'"
                  @click="decrementBarsNoPickup">
                  -
                </v-btn>
                <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars +1'"
                  @click="incrementBarsNoPickup">
                  +
                </v-btn>
              </div>
            </div>
          </v-card>

          <div v-if="transportVisible" class="timeline-transport" :aria-label="t('timelineView.transport')">
            <div class="timeline-transport-inner">
              <PlaybackControls :is-playing="isPlaying" :tempo="tempo" :click-enabled="clickEnabled"
                :count-in-enabled="countInEnabled" :auto-follow-enabled="autoFollowEnabled" :loop-enabled="loopEnabled"
                :playhead="playhead" :total-duration="totalDuration" :practice-active="practiceActive"
                :practice-available="practiceAvailable" :practice-target-label="practiceTargetLabel"
                :practice-detected-label="practiceDetectedLabel" :practice-hint-text="practiceHintText"
                :practice-match-state="practiceMatchState" :record-active="recordActive"
                @toggle-play="emit('toggle-play')" @seek-start="emit('seek-start')"
                @seek-playhead="(t) => emit('seek-playhead', t)" @update-tempo="(v) => emit('update-tempo', v)"
                @update-click="(v) => emit('update-click', v)"
                @update-count-in-enabled="(v) => emit('update-count-in-enabled', v)"
                @update-auto-follow="(v) => emit('update-auto-follow', v)" @update-loop="(v) => emit('update-loop', v)"
                @toggle-practice="emit('toggle-practice')" @toggle-record="emit('toggle-record')" />
            </div>
          </div>
        </div>
      </section>

      <aside v-if="libraryPanelVisible" class="secondary-menu-rail"
        :class="{ 'is-collapsed': secondaryMenuSize === 's', 'is-wide': secondaryMenuSize === 'l' }"
        :aria-label="t('libraryDialog.title')">
        <v-card class="secondary-menu-shell ui-panel pa-2" variant="flat">
          <div class="secondary-menu-head">
            <div class="secondary-menu-head-row">
              <div class="secondary-menu-title">{{ t('libraryDialog.title') }}</div>
              <v-btn size="x-small" variant="text" class="secondary-menu-toggle" icon="mdi-arrow-left-right"
                :title="'Sidebar width'" @click="cycleSecondaryMenuSize" />
            </div>
            <div v-if="secondaryMenuSize !== 's'" class="secondary-menu-subtitle">
              {{ libraryEnabled ? t('modeSelector.openLibrary') : t('modeSelector.librarySignIn') }}
            </div>
          </div>
          <div class="secondary-menu">
            <v-btn v-if="secondaryMenuSize !== 's'" block prepend-icon="mdi-book-open-page-variant" size="default"
              variant="tonal" class="secondary-menu-btn secondary-menu-link" :title="t('modeSelector.openLibrary')"
              :disabled="!libraryEnabled" @click="emit('open-library')">
              {{ t('modeSelector.openLibrary') }}
            </v-btn>
            <v-btn v-else icon="mdi-book-open-page-variant" size="small" variant="tonal" class="secondary-menu-btn"
              :title="t('modeSelector.openLibrary')" :disabled="!libraryEnabled" @click="emit('open-library')" />
          </div>
        </v-card>
      </aside>
    </div>
  </div>
</template>

<script setup>
import PlaybackControls from './controls/PlaybackControls.vue'
import TimelineTrack from './TimelineTrack.vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSelectionStore } from '@/store/useSelection'
import { useI18n } from '@/i18n'

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
  countInEnabled: { type: Boolean, default: true },
  autoFollowEnabled: { type: Boolean, default: true },
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
  fretboardVisible: { type: Boolean, default: true },
  chordMenuVisible: { type: Boolean, default: true },
  handPositionVisible: { type: Boolean, default: false },
  timelineVisible: { type: Boolean, default: true },
  transportVisible: { type: Boolean, default: true },
  libraryPanelVisible: { type: Boolean, default: true },
  showChordShapePanel: { type: Boolean, default: false },

  zoomPxPerBlock: { type: Number, default: 50 },

  totalDuration: { type: Number, required: true },
  totalBlocks: { type: Number, required: true },
  playhead: { type: Number, required: true },
  currentStep: { type: Number, required: true },
  practiceActive: { type: Boolean, default: false },
  practiceAvailable: { type: Boolean, default: true },
  practiceTargetLabel: { type: String, default: '' },
  practiceDetectedLabel: { type: String, default: '' },
  practiceHintText: { type: String, default: '' },
  practiceMatchState: { type: String, default: '' },
  recordActive: { type: Boolean, default: false },

  tracks: { type: Array, required: true },
  handPositionNotes: { type: Array, default: () => [] },
  markers: { type: Array, default: () => [] },
  ghostNotesEnabled: { type: Boolean, default: false },
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
  'update-count-in-enabled',
  'update-auto-follow',
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
  'update-fretboard-visible',
  'update-chord-menu-visible',
  'update-show-chord-shape-panel',
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
  'update-timeline-visible',
  'update-transport-visible',
  'update-library-panel-visible',
  'update-active-notes-visible',
  'open-library',
  'toggle-theme',
  'update-total-blocks',
  'add-marker-at-playhead',
  'loop-to-selection',
  'quantize-selection',
  'scale-selection-length',
  'update-ghost-notes',
  'toggle-practice',
  'toggle-record',
])
const { t } = useI18n()

const beatBottomItems = [1, 2, 4, 8]
const pickupMax = computed(() => {
  const top = Number.parseInt(String(props.beatTop), 10)
  const maxByBeat = Number.isFinite(top) && top > 1 ? top - 1 : 1
  return Math.max(1, Math.min(9, maxByBeat))
})

function updateBeatTopFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-top', Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
}

function updateBeatBottomFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-bottom', beatBottomItems.includes(parsed) ? parsed : 4)
}

function updatePickupBeatsFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  if (!Number.isFinite(parsed)) return
  const next = Math.max(1, Math.min(pickupMax.value, parsed))
  emit('update-pickup-beats', next)
}

const zoomPx = computed(() => Math.max(8, Number(props.zoomPxPerBlock) || 50))
const ZOOM_UI_MIN = 12
const ZOOM_UI_MAX = 120
const ZOOM_UI_STEP = 2
// Must match the visual left inset of `.timeline-track` (see TimelineTrack.vue: margin-left).
const TRACK_START_OFFSET_PX = 6

const visibleTracks = computed(() => {
  return Array.isArray(props.tracks) ? props.tracks : []
})

const showBarNumbersOnAuxTrack = computed(() => Boolean(props.handPositionVisible))

function isFirstVisibleTrack(track) {
  const first = Array.isArray(visibleTracks.value) ? visibleTracks.value[0] : null
  return Number(track?.stringIdx) === Number(first?.stringIdx)
}

const selection = useSelectionStore()

const timelineMainStyle = computed(() => {
  const widths = { s: 64, m: 224, l: 320 }
  const secondaryMenuWidthPx = props.libraryPanelVisible
    ? widths[secondaryMenuSize.value] || widths.m
    : 0
  return {
    '--secondary-menu-w': `${secondaryMenuWidthPx}px`,
  }
})

const scrollEl = ref(null)
const secondaryMenuSize = ref('m')
const marqueeActive = ref(false)
const marqueeStart = ref({ x: 0, y: 0 })
const marqueeEnd = ref({ x: 0, y: 0 })
let marqueeRaf = 0
let marqueePointerId = null
const lengthDrag = ref({
  active: false,
  pointerId: null,
  startClientX: 0,
  startScrollLeft: 0,
  startBlocks: 0,
  previewBlocks: null,
})
const loopDrag = ref({
  active: false,
  kind: '',
  pointerId: null,
})

function cycleSecondaryMenuSize() {
  const order = ['s', 'm', 'l']
  const current = order.indexOf(String(secondaryMenuSize.value || 'm'))
  secondaryMenuSize.value = order[(current + 1) % order.length]
}

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
    startScrollLeft: Number(scrollEl.value?.scrollLeft) || 0,
    startBlocks: Math.max(1, Number(props.totalBlocks) || 1),
    previewBlocks: Math.max(1, Number(props.totalBlocks) || 1),
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

  const currentScroll = Number(scrollEl.value?.scrollLeft) || 0
  const scrollDx = currentScroll - (Number(drag.startScrollLeft) || 0)
  const pointerDx = (Number(e?.clientX) || 0) - drag.startClientX
  const dx = pointerDx + scrollDx
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const deltaBlocks = dx / zoom
  const rawNext = Math.max(1, drag.startBlocks + deltaBlocks)
  // Keep drag lightweight: local preview while moving, commit on pointerup.
  lengthDrag.value = { ...drag, previewBlocks: rawNext }

  // Keep the length handle in view while dragging, especially when extending to the right.
  const el = scrollEl.value
  if (el) {
    const handleX = TRACK_START_OFFSET_PX + rawNext * zoom
    const margin = 56
    const viewLeft = Number(el.scrollLeft) || 0
    const viewRight = viewLeft + (Number(el.clientWidth) || 0)

    let nextScrollLeft = viewLeft
    if (handleX > viewRight - margin) {
      nextScrollLeft = handleX - (Number(el.clientWidth) || 0) + margin
    } else if (handleX < viewLeft + margin) {
      nextScrollLeft = handleX - margin
    }

    if (nextScrollLeft !== viewLeft) {
      const maxScroll = Math.max(0, (Number(el.scrollWidth) || 0) - (Number(el.clientWidth) || 0))
      el.scrollLeft = Math.max(0, Math.min(maxScroll, nextScrollLeft))
    }
  }

  e.preventDefault()
  e.stopPropagation()
}

function onLengthHandlePointerUp(e) {
  const drag = lengthDrag.value
  if (!drag.active) return
  if (e?.pointerId !== drag.pointerId) return

  const rawNext = Math.max(1, Number(drag.previewBlocks) || drag.startBlocks || 1)
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
    startScrollLeft: 0,
    startBlocks: 0,
    previewBlocks: null,
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
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const startPx = TRACK_START_OFFSET_PX + loopRange.value.start * zoom
  const endPx = TRACK_START_OFFSET_PX + loopRange.value.end * zoom
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
  const zoom = Math.max(8, Number(zoomPx.value) || 50)
  const raw = (x - TRACK_START_OFFSET_PX) / zoom
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
})

const effectiveTotalBlocks = computed(() => {
  if (lengthDrag.value.active) {
    const preview = Number(lengthDrag.value.previewBlocks)
    if (Number.isFinite(preview) && preview > 0) return preview
  }
  return Math.max(1, Number(props.totalBlocks) || 1)
})

const trackMinWidthPx = computed(() => {
  const blocks = Math.max(1, Number(effectiveTotalBlocks.value) || 1)
  return blocks * zoomPx.value
})

const trackEndPx = computed(() => {
  return trackMinWidthPx.value + TRACK_START_OFFSET_PX
})

const markerItems = computed(() => {
  const totalDurationMs = Number(props.totalDuration) || 0
  if (!(totalDurationMs > 0)) return []
  const zoom = zoomPx.value
  return (Array.isArray(props.markers) ? props.markers : [])
    .map((m, idx) => {
      const tMs = Number(m?.timeMs)
      if (!Number.isFinite(tMs) || tMs < 0) return null
      const blocks = (tMs / totalDurationMs) * Math.max(1, Number(props.totalBlocks) || 1)
      return {
        id: String(m?.id ?? `m_${idx}`),
        label: String(m?.label ?? `M${idx + 1}`),
        title: String(m?.title ?? t('timelineView.markerN', { index: idx + 1 })),
        timeMs: tMs,
        leftPx: TRACK_START_OFFSET_PX + blocks * zoom,
      }
    })
    .filter(Boolean)
})

function onTimelineWheel(e) {
  if (!e?.ctrlKey) return
  const el = scrollEl.value
  if (!el?.getBoundingClientRect) return
  e.preventDefault()
  const rect = el.getBoundingClientRect()
  const x = Number(e.clientX) - rect.left
  const anchorContentX = el.scrollLeft + x
  const current = zoomPx.value
  const next = Math.max(8, Math.min(200, current + (Number(e.deltaY) < 0 ? 4 : -4)))
  if (next === current) return
  emit('update-zoom', next)
  // Keep zoom anchored at cursor position.
  requestAnimationFrame(() => {
    const ratio = next / current
    el.scrollLeft = Math.max(0, anchorContentX * ratio - x)
  })
}

function decrementZoom() {
  const current = Number(props.zoomPxPerBlock) || 50
  const next = Math.max(ZOOM_UI_MIN, current - ZOOM_UI_STEP)
  emit('update-zoom', next)
}

function incrementZoom() {
  const current = Number(props.zoomPxPerBlock) || 50
  const next = Math.min(ZOOM_UI_MAX, current + ZOOM_UI_STEP)
  emit('update-zoom', next)
}

watch(
  () => [props.playhead, props.isPlaying, props.totalDuration, props.totalBlocks, zoomPx.value],
  () => {
    if (!props.isPlaying || !props.autoFollowEnabled) return
    const el = scrollEl.value
    if (!el) return

    const totalDurationMs = Number(props.totalDuration) || 0
    const totalBlocksSafe = Math.max(1, Number(props.totalBlocks) || 1)
    if (!(totalDurationMs > 0)) return

    const timePerBlock = totalDurationMs / totalBlocksSafe
    if (!(timePerBlock > 0)) return

    const playheadBlocks = Math.max(0, Number(props.playhead) || 0) / timePerBlock
    const playheadPx = TRACK_START_OFFSET_PX + playheadBlocks * zoomPx.value

    const viewportWidth = Math.max(1, el.clientWidth || 0)
    const midpointX = el.scrollLeft + viewportWidth / 2
    if (playheadPx < midpointX) return

    const maxScrollLeft = Math.max(0, el.scrollWidth - viewportWidth)
    const targetScrollLeft = Math.min(maxScrollLeft, Math.max(0, playheadPx - viewportWidth / 2))
    if (targetScrollLeft <= el.scrollLeft + 0.5) return
    // Soft follow instead of hard snapping.
    const eased = el.scrollLeft + (targetScrollLeft - el.scrollLeft) * 0.3
    el.scrollLeft = Math.min(maxScrollLeft, Math.max(0, eased))
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

const beatsPerBarSafe = computed(() => {
  const v = Number.parseInt(String(props.beatTop), 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const beatBottomSafe = computed(() => {
  const v = Number.parseInt(String(props.beatBottom), 10)
  return [1, 2, 4, 8].includes(v) ? v : 4
})

const blocksPerBeatSafe = computed(() => 4 / beatBottomSafe.value)
const blocksPerBarSafe = computed(() => beatsPerBarSafe.value * blocksPerBeatSafe.value)

const pickupBeatsSafe = computed(() => {
  const raw = Number.parseInt(String(props.pickupBeats), 10)
  if (!Number.isFinite(raw)) return 1
  const maxByBeat = Math.max(1, beatsPerBarSafe.value - 1)
  return Math.max(1, Math.min(Math.min(9, raw), maxByBeat))
})

const pickupBlocksSafe = computed(() =>
  props.pickupEnabled ? pickupBeatsSafe.value * blocksPerBeatSafe.value : 0,
)

const barsNoPickup = computed({
  get: () => {
    const blocksPerBar = Number(blocksPerBarSafe.value)
    if (!(blocksPerBar > 0)) return 1
    const total = Math.max(0, Number(props.totalBlocks) || 0)
    return Math.max(1, Math.floor(total / blocksPerBar))
  },
  set: (v) => {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n)) return
    const nextBars = Math.max(1, Math.min(512, n))
    const total = nextBars * Number(blocksPerBarSafe.value || 1)
    emit('update-total-blocks', Number(total.toFixed(3)))
  },
})

const barsNoPickupLocal = computed({
  get: () => String(barsNoPickup.value),
  set: (v) => {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n)) return
    barsNoPickup.value = n
  },
})

function decrementBarsNoPickup() {
  barsNoPickup.value = Math.max(1, Number(barsNoPickup.value) - 1)
}

function incrementBarsNoPickup() {
  barsNoPickup.value = Math.min(512, Number(barsNoPickup.value) + 1)
}

const barBeatLabel = computed(() => {
  const beatsPerBarRaw = Number.parseInt(String(props.beatTop), 10)
  const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 1

  const tpb = timePerBlockMs.value
  if (!(tpb > 0)) return t('timelineView.barBeatFallback')

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
  --secondary-menu-w: 224px;
  --main-grow-right: 0px;
  --main-menu-v-pad: var(--space-3);
  --app-menubar-h: 30px;
  --top-bars-h: calc(var(--v-layout-top, 0px) + var(--app-menubar-h));
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-1);
  margin-right: 0;
}

.timeline-collapse-btn-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-options-btn-wrap {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-top-zoom {
  margin-right: 2px;
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
  padding: var(--space-2) var(--space-2) 0;
}

.secondary-menu-rail {
  position: fixed;
  right: 0;
  top: var(--top-bars-h);
  bottom: 0;
  width: var(--secondary-menu-w);
  z-index: 25;
  padding: var(--main-menu-v-pad) var(--space-2);
}

.secondary-menu-shell {
  height: calc(100vh - var(--top-bars-h) - (2 * var(--main-menu-v-pad)));
}

.secondary-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secondary-menu-head {
  margin-bottom: 8px;
}

.secondary-menu-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.secondary-menu-title {
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  color: var(--color-text);
}

.secondary-menu-subtitle {
  margin-top: 3px;
  font-size: 0.74rem;
  line-height: 1.3;
  color: var(--color-text-muted);
}

.secondary-menu-toggle {
  flex: 0 0 auto;
}

.secondary-menu-btn {
  width: 100%;
}

.secondary-menu-link {
  justify-content: flex-start;
  text-transform: none;
}

.secondary-menu-rail.is-collapsed .secondary-menu-head {
  margin-bottom: 6px;
}

.secondary-menu-rail.is-collapsed .secondary-menu-title {
  display: none;
}

.secondary-menu-rail.is-collapsed .secondary-menu {
  align-items: center;
}

.timeline-body {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-right: calc(var(--secondary-menu-w) + var(--space-4));
  overflow: visible;
}

.timeline-top-row {
  width: 100%;
  min-height: 28px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.timeline-transport {
  position: relative;
  display: flex;
  justify-content: stretch;
  margin-top: 6px;
  padding: 0;
  pointer-events: auto;
}

.timeline-transport-inner {
  width: 100%;
  max-width: none;
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: color-mix(in srgb, var(--color-surface) 90%, var(--color-surface-2) 10%);
  box-shadow: none;
  overflow: visible;
}

.timeline {
  position: relative;
  border-radius: 0;
  border: 0;
  background: color-mix(in srgb, var(--color-surface) 93%, var(--color-surface-2) 7%);
  box-shadow: none;
  overflow: hidden;
  padding: 6px;
}

.timeline.is-collapsed :deep(.timeline-track) {
  /* Collapse height to one third of the normal row height (44px). */
  height: calc(44px / 3);
}

.timeline.is-collapsed :deep(.note-label) {
  display: none;
}

.timeline-scroll {
  position: relative;
  flex: 1 1 auto;
  overflow: hidden;
  background: color-mix(in srgb, var(--color-surface) 96%, var(--color-surface-2) 4%);
}

.timeline-scroll::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  box-shadow:
    inset 0 4px 12px -5px rgb(0 0 0 / 52%),
    inset 0 -4px 12px -5px rgb(0 0 0 / 48%),
    inset 18px 0 18px -11px rgb(0 0 0 / 54%),
    inset -18px 0 18px -11px rgb(0 0 0 / 50%);
}

.timeline-scroll-viewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.timeline-columns {
  display: flex;
  width: 100%;
  column-gap: var(--panel-side-gap, 6px);
  align-items: stretch;
}

.timeline-column-card {
  border: 1px solid var(--color-border);
  border-radius: 0;
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
}

.timeline-string-names {
  flex: 0 0 17px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0 1px;
  border: 0;
  background: color-mix(in srgb, var(--color-surface-2) 76%, var(--color-surface) 24%);
}

.timeline-string-names-spacer {
  height: 18px;
  flex: 0 0 18px;
}

.timeline-string-name {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timeline-string-name-aux {
  border-bottom: 4px solid rgba(70, 70, 70, 0.75);
  margin-bottom: 4px;
}

.timeline-string-name-btn {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.timeline-string-name-btn.is-active {
  color: var(--color-text);
}

.timeline-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-2) 78%, var(--color-surface) 22%);
  cursor: pointer;
  user-select: none;
  padding: 0;
  transition:
    border-color var(--ui-fast),
    box-shadow var(--ui-fast),
    background-color var(--ui-fast),
    transform var(--ui-fast);
}

.timeline-tool-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.timeline-tool:hover {
  background: color-mix(in srgb, var(--color-surface-2) 64%, var(--color-surface) 36%);
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

.timeline-options {
  flex: 0 0 var(--panel-side-col-w, 36px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 4px;
  border: 0;
}

.timeline-options-btn {
  min-width: 26px;
  padding-inline: 0;
}

.marker-layer {
  position: relative;
  height: 16px;
  margin-bottom: 2px;
}

.timeline-marker {
  position: absolute;
  top: 0;
  width: 2px;
  height: 16px;
  transform: translateX(-50%);
  border: 0;
  padding: 0;
  background: color-mix(in srgb, var(--color-primary) 65%, var(--color-text) 35%);
  cursor: pointer;
}

.timeline-marker-label {
  position: absolute;
  top: 0;
  left: 4px;
  font-size: 9px;
  font-weight: 700;
  color: var(--color-text-muted);
  white-space: nowrap;
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
  pointer-events: auto;
  z-index: 15;
}

.timeline-length-marker {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  display: flex;
  align-items: stretch;
  gap: 2px;
  opacity: 0.95;
  z-index: 3;
  pointer-events: auto;
  cursor: ew-resize;
}

.timeline-length-marker-thin {
  width: 1px;
  background: #000;
}

.timeline-length-marker-thick {
  width: 3px;
  background: #000;
}

.timeline-info {
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  border: 0;
  border-radius: 0;
  min-height: 28px;
}

.timeline-info-tools {
  min-width: 0;
  flex-wrap: wrap;
}

.status-chip {
  width: 133px;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.zoom-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.zoom-value {
  min-width: 28px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.zoom-adjust-btn {
  min-width: 22px;
  height: 22px;
  padding: 0;
}

.bars-input-wrap {
  min-width: 164px;
}

.bars-count-input {
  width: 96px;
  min-width: 96px;
}

.bars-adjust-btn {
  min-width: 22px;
  height: 22px;
  padding: 0;
}

.timeline-info :deep(.v-field) {
  --v-input-control-height: 24px;
  min-height: 24px;
}

.timeline-info :deep(.v-field__input) {
  min-height: 24px;
  padding-top: 0;
  padding-bottom: 0;
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
  .timeline-main {
    margin-right: 0;
  }

  .timeline-layout {
    display: block;
  }

  .timeline-collapse-btn-wrap {
    right: var(--space-2);
  }

  .secondary-menu-rail {
    position: static;
    width: auto;
    height: auto;
    padding: 0;
    margin-top: var(--space-2);
  }

  .secondary-menu-shell {
    height: auto;
  }

  .timeline-body {
    min-width: 0;
    padding-right: 0;
  }

  .status-chip {
    width: auto;
    min-width: 132px;
  }

  .zoom-value {
    min-width: 24px;
  }
}
</style>
