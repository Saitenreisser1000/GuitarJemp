<template>
  <div ref="rootEl" class="fretboard-body" :style="fretboardCssVars">
    <div class="fb-core-pad">
      <div class="fb-core-resizable" :style="coreResizableStyle">
        <div class="fb-stack" :style="{ aspectRatio: `${FB_WIDTH} / ${boardH}` }">
          <svg ref="overlayEl" class="fb-layer fb-overlay" :viewBox="`0 ${boardY} ${FB_WIDTH} ${boardH}`"
            preserveAspectRatio="none" style="overflow: visible" @mousemove="onMouseMove" @mouseleave="onMouseLeave"
            @click="onClick">
            <defs>
              <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.woodStops" :key="`wood-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </linearGradient>

              <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.shadeStops" :key="`shade-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </linearGradient>

              <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
                <feComposite operator="in" in2="SourceGraphic" />
              </filter>

              <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.metalStops" :key="`metal-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </linearGradient>

              <radialGradient id="inlay" cx="50%" cy="40%" r="60%">
                <stop v-for="(s, idx) in FRETBOARD_THEME.svg.inlayStops" :key="`inlay-stop-${idx}`" :offset="s.offset"
                  :stop-color="s.color" />
              </radialGradient>

              <clipPath id="fb-core-clip">
                <rect :x="0" :y="0" :width="FB_WIDTH" :height="FB_HEIGHT" />
              </clipPath>
            </defs>

            <g class="fb-board-shell" data-part="board-shell">
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" rx="0" fill="url(#wood)" />
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" rx="0" fill="url(#shade)" />
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" rx="0" fill="transparent" filter="url(#grain)"
                opacity="0.9" />
              <rect :x="4" :y="boardY + 4" :width="FB_WIDTH - 8" :height="boardH - 8" rx="0" fill="transparent"
                :stroke="FRETBOARD_THEME.svg.boardBorderStroke" stroke-width="2" />
              <rect :x="0" :y="boardY" :width="NUT_WIDTH" :height="boardH" :fill="FRETBOARD_THEME.svg.nutFill"
                opacity="0.95" />
              <rect :x="NUT_WIDTH" :y="boardY" width="3" :height="boardH" :fill="FRETBOARD_THEME.svg.nutDividerFill"
                opacity="0.9" />
              <g class="fb-frets">
                <template v-for="(x, i) in fretLinesPx" :key="`fret-${i}`">
                  <line v-if="i === 0" :x1="x + NUT_WIDTH" :y1="boardY" :x2="x + NUT_WIDTH" :y2="boardY + boardH"
                    :stroke="FRETBOARD_THEME.svg.fretZeroStroke" stroke-width="2" opacity="0.9" />
                  <line v-else :x1="x - 0.9" :y1="boardY" :x2="x - 0.9" :y2="boardY + boardH"
                    :stroke="FRETBOARD_THEME.svg.fretGlowStroke" :stroke-width="i === 12 ? 1.6 : 1.3" opacity="0.95" />
                  <line v-if="i !== 0" :x1="x" :y1="boardY" :x2="x" :y2="boardY + boardH" stroke="url(#metal)"
                    :stroke-width="i === 12 ? 3.2 : 2.6" opacity="0.95" />
                  <line v-if="i !== 0" :x1="x + 1.1" :y1="boardY" :x2="x + 1.1" :y2="boardY + boardH"
                    :stroke="FRETBOARD_THEME.svg.fretShadowStroke" :stroke-width="i === 12 ? 1.7 : 1.4" opacity="0.95" />
                </template>
              </g>
            </g>

            <g class="fb-board-core" data-part="board-core" clip-path="url(#fb-core-clip)">
              <g class="fb-inlays" opacity="0.95">
                <template v-for="dot in inlayDots" :key="dot.key">
                  <circle :cx="dot.x" :cy="dot.y" :r="dot.r" fill="url(#inlay)" />
                  <circle :cx="dot.x" :cy="dot.y" :r="dot.r" fill="transparent" :stroke="FRETBOARD_THEME.svg.inlayOutlineStroke"
                    stroke-width="1" />
                </template>
              </g>

              <g class="fb-strings" opacity="0.9">
                <line v-for="s in strings" :key="`string-${s.string}`" :x1="-STRING_OVERHANG" :y1="s.y" :x2="FB_WIDTH"
                  :y2="s.y" :stroke="FRETBOARD_THEME.svg.stringStroke" :stroke-width="s.w" stroke-linecap="round" />
                <line v-for="s in strings" :key="`string-shadow-${s.string}`" :x1="-STRING_OVERHANG" :y1="s.y + 0.9"
                  :x2="FB_WIDTH" :y2="s.y + 0.9" :stroke="FRETBOARD_THEME.svg.stringShadowStroke" :stroke-width="Math.max(1, s.w - 0.6)"
                  stroke-linecap="round" />
              </g>
            </g>
            <g class="fb-interaction-layer" data-part="interaction-layer">
              <!-- transparent hit-area incl. fretboard overhang -->
              <rect :x="0" :y="boardY" :width="FB_WIDTH" :height="boardH" fill="transparent" />

              <!-- String numbers -->
              <g class="fb-string-labels">
                <text v-for="s in strings" :key="`string-label-${s.string}`" :x="-10" :y="s.y + 4" text-anchor="end"
                  font-size="12" font-weight="800" :fill="FRETBOARD_THEME.svg.stringLabelFill" :stroke="FRETBOARD_THEME.svg.stringLabelStroke"
                  stroke-width="2" paint-order="stroke">
                  {{ stringLabelFor(s.string) }}
                </text>
              </g>

              <g v-if="handPositionOverlayRect" class="fb-hand-position-overlay" style="pointer-events: none">
                <rect :x="handPositionOverlayRect.x" :y="handPositionOverlayRect.y"
                  :width="handPositionOverlayRect.width" :height="handPositionOverlayRect.height"
                  :rx="handPositionOverlayRect.rx" />
              </g>
              <g v-if="suggestedHandPositionOverlayRect" class="fb-hand-position-suggested"
                style="pointer-events: none">
                <rect :x="suggestedHandPositionOverlayRect.x" :y="suggestedHandPositionOverlayRect.y"
                  :width="suggestedHandPositionOverlayRect.width" :height="suggestedHandPositionOverlayRect.height"
                  :rx="suggestedHandPositionOverlayRect.rx" />
                <text :x="suggestedHandPositionOverlayRect.labelX" :y="suggestedHandPositionOverlayRect.labelY">
                  {{
                    t('fretboardShow.suggestedPosition', {
                      from: suggestedHandPositionOverlayRect.fromFret,
                      to: suggestedHandPositionOverlayRect.toFret,
                    })
                  }}
                </text>
              </g>

              <!-- ToneDots -->
              <g class="fb-tone-dots">
                <g v-if="harmonyGuideDots.length" class="fb-harmony-guides" style="pointer-events: none">
                  <circle v-for="d in harmonyGuideDots"
                    :key="`guide-${d.string}-${d.fret}-${d.inChord ? 1 : 0}-${d.inScale ? 1 : 0}`" :cx="toneDotX(d)"
                    :cy="toneDotY(d)" :r="harmonyGuideRadius(d)" :fill="harmonyGuideFill(d)"
                    :stroke="harmonyGuideStroke(d)" :stroke-width="harmonyGuideStrokeWidth(d)" />
                </g>
                <g v-if="playbackTravelLine" class="fb-playback-travel-line" style="pointer-events: none">
                  <line :x1="playbackTravelLine.x1" :y1="playbackTravelLine.y1" :x2="playbackTravelLine.x2"
                    :y2="playbackTravelLine.y2" :stroke="playbackTravelLine.color" :style="{
                      strokeWidth: `${playbackTravelLine.strokeWidth}px`,
                      filter: playbackTravelLine.filter,
                    }" />
                </g>
                <g
                  v-if="directionPreviewSegments.length"
                  class="fb-direction-preview"
                  style="pointer-events: none"
                >
                  <line
                    v-for="seg in directionPreviewSegments"
                    :key="`dir-preview-${seg.fromKey}-${seg.toKey}`"
                    :x1="seg.x1"
                    :y1="seg.y1"
                    :x2="seg.x2"
                    :y2="seg.y2"
                    :stroke="seg.color"
                    :style="{
                      opacity: seg.opacity,
                      strokeWidth: `${seg.strokeWidth}px`,
                      filter: seg.filter,
                    }"
                  />
                </g>
                <g v-if="nowMarkers.length" class="fb-now-markers" style="pointer-events: none">
                  <g v-for="m in nowMarkers" :key="`now-${m.noteKey}`">
                    <line class="fb-now-string-line" :x1="NUT_WIDTH" :y1="m.y" :x2="FB_WIDTH" :y2="m.y"
                      :stroke="m.color" :style="{ opacity: m.lineOpacity }" />
                    <line class="fb-now-cross" :x1="m.x - m.crossHalf" :y1="m.y" :x2="m.x + m.crossHalf" :y2="m.y"
                      :stroke="m.color" />
                    <circle class="fb-now-ring" :cx="m.x" :cy="m.y" :r="m.ringR" :stroke="m.color" />
                  </g>
                </g>
                <g v-if="playbackSelfLoop" class="fb-playback-self-loop" style="pointer-events: none">
                  <circle class="self-loop-base" :cx="playbackSelfLoop.cx" :cy="playbackSelfLoop.cy"
                    :r="playbackSelfLoop.r" fill="none" :stroke="playbackSelfLoop.color" />
                  <line :x1="playbackSelfLoop.x1" :y1="playbackSelfLoop.y1" :x2="playbackSelfLoop.x2"
                    :y2="playbackSelfLoop.y2" :stroke="playbackSelfLoop.color" />
                  <circle class="self-loop-progress" :cx="playbackSelfLoop.cx" :cy="playbackSelfLoop.cy"
                    :r="playbackSelfLoop.r" fill="none" :stroke="playbackSelfLoop.color"
                    :stroke-dasharray="playbackSelfLoop.dasharray" :stroke-dashoffset="playbackSelfLoop.dashoffset" />
                  <circle class="self-loop-head" :cx="playbackSelfLoop.headX" :cy="playbackSelfLoop.headY" :r="2.7"
                    :fill="playbackSelfLoop.color" />
                </g>

                <!-- Hover preview for inactive positions (editor only) -->
                <circle v-if="hoveredPreviewToneDot" :cx="toneDotX(hoveredPreviewToneDot)"
                  :cy="toneDotY(hoveredPreviewToneDot)" :r="previewR()" fill="transparent"
                  :stroke="FRETBOARD_THEME.svg.hoverPreviewStroke" stroke-width="3" style="pointer-events: none" />

                <g v-for="d in toneDotsForRender" :key="`tone-dot-${d._noteKey ?? `${d.string}-${d.fret}`}`">
                  <circle :cx="toneDotX(d)" :cy="toneDotY(d)" :r="toneDotR(d)" :fill="toneDotFill(d)"
                    :opacity="toneDotOpacity(d)" :stroke="toneDotStroke(d)" :stroke-width="toneDotStrokeWidth(d)"
                    :style="toneDotStyle(d)"
                    @mouseenter="onToneDotEnter(d, $event)" @mouseleave="onToneDotLeave(d)"
                    @click="onToneDotClick(d, $event)" @contextmenu.prevent.stop="onToneDotContextMenu(d, $event)"
                    @pointerdown="onToneDotPointerDown(d, $event)" @pointermove="onToneDotPointerMove($event)"
                    @pointerup="onToneDotPointerUp($event)" @pointercancel="onToneDotPointerUp($event)" />
                  <image
                    v-if="toneDotIcon(d)"
                    class="fb-tone-dot-symbol-icon"
                    :x="toneDotX(d) - 7"
                    :y="toneDotY(d) - 7"
                    width="14"
                    height="14"
                    :href="toneDotIcon(d)"
                  />
                  <text v-else class="fb-tone-dot-symbol" :x="toneDotX(d)" :y="toneDotY(d)">
                    {{ toneDotSymbol(d) }}
                  </text>
                  <text v-if="showPitchLabel(d)" class="fb-tone-dot-pitch" :x="toneDotX(d)" :y="toneDotY(d) + 11">
                    {{ toneDotPitchLabel(d) }}
                  </text>
                </g>

                <circle v-if="nextNotePreviewDot" class="fb-next-note-preview" :cx="toneDotX(nextNotePreviewDot)"
                  :cy="toneDotY(nextNotePreviewDot)" :r="toneDotR(nextNotePreviewDot) + 7" />

                <!-- Drag preview (editor only): transparent ghost dot at the current target position -->
                <circle v-if="dragPreviewToneDot" :cx="toneDotX(dragPreviewToneDot)" :cy="toneDotY(dragPreviewToneDot)"
                  :r="toneDotR(dragPreviewToneDot)" fill="transparent" :stroke="FRETBOARD_THEME.svg.dragPreviewStroke" stroke-width="4"
                  style="pointer-events: none" />
              </g>
              <g v-if="fretViewMask" class="fb-view-mask" style="pointer-events: none">
                <rect :x="0" :y="0" :width="fretViewMask.left" :height="FB_HEIGHT" />
                <rect :x="fretViewMask.right" :y="0" :width="FB_WIDTH - fretViewMask.right" :height="FB_HEIGHT" />
              </g>
            </g>
          </svg>
          <div class="fb-text-layer">
            <div
              v-for="item in textItems"
              :key="item.id"
              class="fb-text-item"
              :style="{ left: `${item.xPct}%`, top: `${item.yPct}%` }"
            >
              <button
                class="fb-text-item-drag"
                type="button"
                title="Textfeld bewegen"
                @pointerdown.stop.prevent="onTextItemDragStart(item.id, $event)"
              >
                ::
              </button>
              <input
                class="fb-text-item-input"
                type="text"
                :value="item.text"
                placeholder="Text"
                @pointerdown.stop
                @click.stop
                @input="onTextItemInput(item.id, $event)"
              />
              <button
                class="fb-text-item-delete"
                type="button"
                title="Textfeld löschen"
                @pointerdown.stop
                @click.stop="onTextItemDelete(item.id)"
              >
                x
              </button>
            </div>
          </div>
        </div>
        <div class="fb-fret-numbers" aria-hidden="true">
          <span v-for="l in fretLabels" :key="`fret-label-${l.fret}`" class="fb-fret-number"
            :class="{ 'is-marker-fret': isMarkerFret(l.fret) }" :style="{ left: `${l.xPct}%` }">
            {{ l.fret }}
          </span>
        </div>
      </div>
    </div>
    <div v-if="handModeInfoText || handModeWarningText" class="fb-hand-mode-info">
      <span v-if="handModeInfoText">{{ handModeInfoText }}</span>
      <span v-if="handModeWarningText" class="is-warning">{{ handModeWarningText }}</span>
    </div>
    <div v-if="settings.showChordShapePanel" class="fb-chord-shape-panel">
      <span class="fb-chord-detected">{{ t('fretboardShow.chord') }}: {{ detectedChordLabel }}</span>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(1, 0)">
        {{ t('fretboardShow.plusFret') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(-1, 0)">
        {{ t('fretboardShow.minusFret') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(0, -1)">
        {{ t('fretboardShow.stringUp') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canNudgeSelection" @click="() => nudgeSelection(0, 1)">
        {{ t('fretboardShow.stringDown') }}
      </button>
      <button class="fb-shape-btn" type="button" :disabled="!canSaveCurrentShape" @click="saveCurrentShape">
        {{ t('fretboardShow.saveShape') }}
      </button>
      <select v-model="selectedShapeId" class="fb-shape-select" :disabled="!savedShapes.length">
        <option value="">{{ t('fretboardShow.selectShape') }}</option>
        <option v-for="s in savedShapes" :key="s.id" :value="s.id">
          {{ s.name }}
        </option>
      </select>
      <button class="fb-shape-btn" type="button" :disabled="!selectedShape || !props.editable"
        @click="applySelectedShape">
        {{ t('fretboardShow.loadShape') }}
      </button>
      <button class="fb-shape-btn is-danger" type="button" :disabled="!selectedShape" @click="deleteSelectedShape">
        {{ t('fretboardShow.delete') }}
      </button>
    </div>

    <div v-if="tooltip.visible" class="fb-tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">
      {{ tooltip.text }}
    </div>
    <FretboardToneDotContextMenu :open="toneDotContextMenu.open" :x="toneDotContextMenu.x" :y="toneDotContextMenu.y"
      :string="toneDotContextMenu.string" :fret="toneDotContextMenu.fret" :items="toneDotContextMenu.items"
      :delete-label="t('fretboardShow.delete')" @delete-item="onDeleteToneDotContextItem" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FretboardToneDotContextMenu from './FretboardToneDotContextMenu.vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { usePlaybackVisualsStore } from '@/store/usePlaybackVisuals'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'
import { useFretboardOverlayStore } from '@/store/useFretboardOverlay'
import {
  FRETBOARD_SHOW_DOT_BASE_OPACITY_WHILE_PLAYING,
  FRETBOARD_SHOW_DOT_PULSE_MS,
  FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR,
} from '@/features/fretboard/config/fretboardVisuals'
import {
  FRETBOARD_DIMENSIONS,
  FRETBOARD_LAYOUT_BREAKPOINTS,
  FRETBOARD_LAYOUT_PRESETS,
  FRETBOARD_RESIZE,
  FRETBOARD_UI_TOKENS,
} from '@/features/fretboard/config/fretboardLayout'
import {
  FRETBOARD_HAND_POSITION,
  FRETBOARD_INLAYS,
  FRETBOARD_INTERACTION,
  FRETBOARD_SHAPES,
  FRETBOARD_TONE_DOTS,
} from '@/features/fretboard/config/fretboardBehavior'
import { FRETBOARD_THEME } from '@/features/fretboard/config/fretboardTheme'
import { NOTE_VALUE_ITEMS, normalizeNoteValue, noteValueItem } from '@/config/noteValues'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForFretString } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'
import { DEFAULT_TIME_PER_BLOCK_MS } from '@/features/timeline/config/grid'
import { gridIndexToStartMs, lengthBlocksToDurationMs } from '@/domain/timelineTime'
import { useI18n } from '@/i18n'

defineOptions({ name: 'FretboardView' })

const props = defineProps({
  numFrets: { type: Number, required: true },
  editable: { type: Boolean, default: false },
  coreResizePx: { type: Number, default: 0 },
})

const FB_WIDTH = FRETBOARD_DIMENSIONS.width
const FB_HEIGHT = FRETBOARD_DIMENSIONS.height
const NUT_WIDTH = FRETBOARD_DIMENSIONS.nutWidth
const BOARD_OVERHANG = FRETBOARD_DIMENSIONS.boardOverhang
const STRING_OVERHANG = FRETBOARD_DIMENSIONS.stringOverhang
const CORE_RESIZE_SCALE_DIVISOR = FRETBOARD_RESIZE.coreScaleDivisor
const rootEl = ref(null)
const overlayEl = ref(null)
const viewportWidthPx = ref(Number(globalThis?.innerWidth) || 1440)

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()
const playbackVisuals = usePlaybackVisualsStore()
const handPositionsStore = useHandPositionsStore()
const harmonyMenu = useHarmonyMenuStore()
const overlay = useFretboardOverlayStore()
const { t } = useI18n()

const { playState, playheadMs } = storeToRefs(transport)
const { handPositions } = storeToRefs(handPositionsStore)
const { chordPitchClasses, scalePitchClasses, patternFretRange, showChord, showScale, scaleRoot, chordRoot } =
  storeToRefs(harmonyMenu)
const { placementArmed, textItems } = storeToRefs(overlay)
const isPlaying = computed(() => playState.value === 'playing')
const fretViewMode = ref('full')
const fretViewFrom = ref(0)
const fretViewTo = ref(Math.max(0, Number(props.numFrets) || 12))
const fretViewRange = computed(() => {
  const max = Math.max(0, Number(props.numFrets) || 12)
  if (fretViewMode.value !== 'range') return { from: 0, to: max }
  const from = Math.max(0, Math.min(max, Number(fretViewFrom.value) || 0))
  const to = Math.max(from, Math.min(max, Number(fretViewTo.value) || max))
  return { from, to }
})
const fretViewMask = computed(() => {
  if (fretViewMode.value !== 'range') return null
  const { from, to } = fretViewRange.value
  const lines = fretLinesPx.value
  const left = from <= 1 ? NUT_WIDTH : Number(lines[from - 1] ?? NUT_WIDTH)
  const right = Number(lines[to] ?? FB_WIDTH)
  if (!(right > left)) return null
  return { left, right }
})

function isFretInView(fret) {
  const n = Number(fret)
  if (!Number.isFinite(n)) return false
  const r = fretViewRange.value
  return n >= r.from && n <= r.to
}

watch(
  () => Number(props.numFrets) || 12,
  (maxRaw) => {
    const max = Math.max(0, Number(maxRaw) || 12)
    if (Number(fretViewFrom.value) > max) fretViewFrom.value = max
    if (Number(fretViewTo.value) > max) fretViewTo.value = max
    if (Number(fretViewTo.value) < Number(fretViewFrom.value))
      fretViewTo.value = Number(fretViewFrom.value)
  },
  { immediate: true },
)

const { highlightedNoteKeys, pulseStarts, directionPreview } = storeToRefs(playbackVisuals)
const playedNoteKeys = ref(new Set())

const LONG_PRESS_MS = FRETBOARD_INTERACTION.longPressMs
const CLICK_SUPPRESS_MS = FRETBOARD_INTERACTION.clickSuppressMs

const dragState = ref({
  active: false,
  noteKey: null,
  pointerId: null,
  startAtMs: 0,
  target: null,
})

let longPressTimer = null
let suppressClicksUntilMs = 0
const CHORD_SHAPES_STORAGE_KEY = FRETBOARD_SHAPES.storageKey
const savedShapes = ref([])
const selectedShapeId = ref('')

function posKeyForNote(note) {
  const string = Number(note?.string)
  const fret = Number(note?.fret)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  return `${string}-${fret}`
}

const highlightedNoteKeySet = computed(() => {
  const keys = Array.isArray(highlightedNoteKeys.value) ? highlightedNoteKeys.value : []
  return new Set(keys.map((k) => String(k)))
})

const pulseStartedAtByNoteKey = computed(() => {
  const m = new Map()
  for (const p of pulseStarts.value) {
    const noteKey = p?.key
    const startedAtMs = Number(p?.startedAtMs)
    if (!noteKey || !Number.isFinite(startedAtMs)) continue

    const k = String(noteKey)
    const prev = m.get(k)
    if (prev == null || startedAtMs > prev) m.set(k, startedAtMs)
  }
  return m
})

const animNowMs = ref(0)
let rafId = null

function startAnim() {
  if (rafId != null) return
  const tick = () => {
    animNowMs.value = performance.now()
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
}

function stopAnim() {
  if (rafId == null) return
  cancelAnimationFrame(rafId)
  rafId = null
}

const tuning = computed(() => getTuning(instrument.tuningId))

const stringLabelByNumber = computed(() => {
  const count = Math.max(1, Number(instrument.numStrings) || 6)
  const labels = new Map()

  const openMidi = tuning.value?.openMidi
  if (Array.isArray(openMidi) && openMidi.length >= count) {
    for (let s = 1; s <= count; s++) {
      const midi = Number(openMidi[s - 1])
      const name = Number.isFinite(midi) ? midiToNoteName(midi, { includeOctave: false }) : ''
      labels.set(s, name || String(s))
    }
    return labels
  }

  for (let s = 1; s <= count; s++) labels.set(s, String(s))
  return labels
})

function stringLabelFor(stringNumber) {
  const s = Number(stringNumber)
  return stringLabelByNumber.value.get(s) ?? String(stringNumber)
}

const notesByPosKey = computed(() => {
  const m = new Map()
  for (const note of store.activeNotes) {
    const string = Number(note?.string)
    const fret = Number(note?.fret)
    const key = String(note?.key ?? '')
    if (!key) continue
    if (!Number.isFinite(string) || !Number.isFinite(fret)) continue
    const posKey = `${string}-${fret}`
    const arr = m.get(posKey) ?? []
    arr.push(note)
    m.set(posKey, arr)
  }
  for (const [posKey, notes] of m.entries()) {
    const items = [...notes]
    items.sort((a, b) => {
      const ta = Number(a?.placedAtMs) || 0
      const tb = Number(b?.placedAtMs) || 0
      if (ta !== tb) return ta - tb
      return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
    })
    m.set(posKey, items)
  }
  return m
})

// Per string/fret DotQueue of note keys.
// DotQueue front is the centered ToneDot: order[0] is centered,
// order[1] shifts left by one offset, etc.
const dotQueueByPosKey = ref(new Map())

const defaultDotQueueByPosKey = computed(() => {
  const out = new Map()
  for (const [posKey, notes] of notesByPosKey.value.entries()) {
    // Default DotQueue: newest at front (center).
    out.set(
      posKey,
      notes
        .map((n) => String(n?.key ?? ''))
        .filter(Boolean)
        .reverse(),
    )
  }
  return out
})

// Keep DotQueue state in sync with current notes.
watch(
  () => defaultDotQueueByPosKey.value,
  (next) => {
    const prev = dotQueueByPosKey.value
    const merged = new Map()

    for (const [posKey, defaultKeys] of next.entries()) {
      const def = Array.isArray(defaultKeys) ? defaultKeys.map(String) : []
      const defSet = new Set(def)

      const existing = prev.get(posKey) ?? []
      const kept = existing.map(String).filter((k) => defSet.has(k))
      const keptSet = new Set(kept)
      const prepended = def.filter((k) => !keptSet.has(k))

      // New notes should appear at the front/center.
      merged.set(posKey, [...prepended, ...kept])
    }

    dotQueueByPosKey.value = merged
  },
  { immediate: true },
)

// Playback DotQueue behavior:
// - When a ToneDot starts playing, it becomes the queue front (center + top).
// - When it stops being highlighted, it moves to the back.
const lastPulseId = ref('')
watch(
  () => pulseStarts.value,
  (arr) => {
    const p = Array.isArray(arr) ? arr[0] : null
    const k = p?.key != null ? String(p.key) : ''
    const startedAtMs = Number(p?.startedAtMs)
    if (!k || !Number.isFinite(startedAtMs)) return

    const played = new Set(playedNoteKeys.value)
    played.add(k)
    playedNoteKeys.value = played

    const pulseId = `${k}:${startedAtMs}`
    if (pulseId === lastPulseId.value) return
    lastPulseId.value = pulseId

    const note = noteByKey.value.get(k)
    const posKey = posKeyForNote(note)
    if (!posKey) return

    const order = dotQueueByPosKey.value.get(posKey)
    if (!Array.isArray(order) || order.length < 2) return

    const idx = order.findIndex((x) => String(x ?? '') === k)
    if (idx < 0) return

    // Bring played ToneDot to the front (center/top).
    const rotated = [order[idx], ...order.slice(0, idx), ...order.slice(idx + 1)]
    const next = new Map(dotQueueByPosKey.value)
    next.set(posKey, rotated)
    dotQueueByPosKey.value = next
  },
  { deep: true },
)

let prevHighlightedKeys = new Set()
watch(
  () => highlightedNoteKeys.value,
  (keys) => {
    if (!isPlaying.value) {
      prevHighlightedKeys = new Set(Array.isArray(keys) ? keys.map((k) => String(k)) : [])
      return
    }

    const next = new Set(Array.isArray(keys) ? keys.map((k) => String(k)) : [])
    const ended = []
    for (const k of prevHighlightedKeys) {
      if (!next.has(k)) ended.push(k)
    }

    if (ended.length === 0) {
      prevHighlightedKeys = next
      return
    }

    let changed = false
    const nextQueue = new Map(dotQueueByPosKey.value)

    for (const k of ended) {
      const note = noteByKey.value.get(k)
      const posKey = posKeyForNote(note)
      if (!posKey) continue

      const order = nextQueue.get(posKey)
      if (!Array.isArray(order) || order.length < 2) continue

      const idx = order.findIndex((x) => String(x ?? '') === k)
      if (idx < 0) continue

      const rotated = [...order.slice(0, idx), ...order.slice(idx + 1), order[idx]]
      nextQueue.set(posKey, rotated)
      changed = true
    }

    if (changed) dotQueueByPosKey.value = nextQueue
    prevHighlightedKeys = next
  },
  { deep: true, immediate: true },
)

const toneDotsForRender = computed(() => {
  const out = []

  // Render order per position is driven by a DotQueue (see dotQueueByPosKey).
  // This allows rotating the visual stack when notes are played.
  for (const [posKey, notes] of notesByPosKey.value.entries()) {
    const items = Array.isArray(notes) ? [...notes] : []
    const byKey = new Map(items.map((n) => [String(n?.key ?? ''), n]).filter(([k]) => k))
    const order = dotQueueByPosKey.value.get(posKey) ?? []
    const visibleLimit = 2
    const keys = order.filter((k) => byKey.has(String(k))).slice(0, visibleLimit)

    const [stringRaw, fretRaw] = String(posKey).split('-')
    const string = Number(stringRaw)
    const fret = Number(fretRaw)
    if (!isFretInView(fret)) continue

    const count = keys.length
    // Draw order: back-to-front so queue front (index 0) is rendered on top.
    for (let i = count - 1; i >= 0; i--) {
      const key = String(keys[i] ?? '')
      const note = byKey.get(key)
      if (!note) continue
      out.push({
        string,
        fret,
        color: note?.color,
        _noteKey: note?.key,
        _placedAtMs: Number(note?.placedAtMs) || 0,
        _stackIndex: i,
        _stackCount: count,
        _kind: 'note',
      })
    }
  }

  return out
})

const noteByKey = computed(() => {
  const m = new Map()
  for (const n of store.activeNotes) {
    const k = String(n?.key ?? '')
    if (!k) continue
    m.set(k, n)
  }
  return m
})

const notesAtPlayhead = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t)) return []
  const entries = timelineNoteEntries.value
  if (!entries.length) return []

  // Binary-search first event that starts after current playhead, then scan around it.
  let lo = 0
  let hi = entries.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (entries[mid].startMs <= t) lo = mid + 1
    else hi = mid
  }
  const out = []
  for (let i = Math.max(0, lo - 8); i < Math.min(entries.length, lo + 8); i += 1) {
    const entry = entries[i]
    if (t >= entry.startMs && t < entry.endMs) out.push(entry.note)
  }
  return out
})

const currentChordSourceNotes = computed(() => {
  const selected = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  if (selected.length >= 2) {
    return selected.map((k) => noteByKey.value.get(String(k))).filter(Boolean)
  }
  return notesAtPlayhead.value
})

function normalizePitchClassName(pc) {
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
  return names[((pc % 12) + 12) % 12]
}

function detectChordNameFromPitchClasses(pitchClasses) {
  if (!(pitchClasses instanceof Set) || pitchClasses.size < 2) return ''
  const pcs = Array.from(pitchClasses).map((n) => ((Number(n) % 12) + 12) % 12)
  const pcSet = new Set(pcs)
  const patterns = [
    { suffix: '', intervals: [0, 4, 7] },
    { suffix: 'm', intervals: [0, 3, 7] },
    { suffix: 'dim', intervals: [0, 3, 6] },
    { suffix: 'aug', intervals: [0, 4, 8] },
    { suffix: 'sus2', intervals: [0, 2, 7] },
    { suffix: 'sus4', intervals: [0, 5, 7] },
    { suffix: '7', intervals: [0, 4, 7, 10] },
    { suffix: 'maj7', intervals: [0, 4, 7, 11] },
    { suffix: 'm7', intervals: [0, 3, 7, 10] },
  ]

  for (const root of pcs) {
    for (const p of patterns) {
      if (p.intervals.length > pcSet.size) continue
      const ok = p.intervals.every((iv) => pcSet.has((root + iv) % 12))
      if (!ok) continue
      return `${normalizePitchClassName(root)}${p.suffix}`
    }
  }

  return pcs.map(normalizePitchClassName).join('-')
}

const detectedChordLabel = computed(() => {
  const notes = currentChordSourceNotes.value
  if (!Array.isArray(notes) || notes.length < 2) return '—'
  const pcs = new Set()
  for (const n of notes) {
    const midi = midiForFretString(
      { fret: Number(n?.fret), string: Number(n?.string) },
      tuning.value,
    )
    if (!Number.isFinite(Number(midi))) continue
    pcs.add(Number(midi) % 12)
  }
  const name = detectChordNameFromPitchClasses(pcs)
  return name || '—'
})

function shapePositionsFromNotes(notes) {
  const seen = new Set()
  const out = []
  for (const n of notes) {
    const string = Number(n?.string)
    const fret = Number(n?.fret)
    if (!Number.isFinite(string) || !Number.isFinite(fret)) continue
    const key = `${string}-${fret}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ string, fret })
  }
  out.sort((a, b) => a.string - b.string)
  return out
}

const currentShapePositions = computed(() => shapePositionsFromNotes(currentChordSourceNotes.value))
const canSaveCurrentShape = computed(() => currentShapePositions.value.length >= 2)
const selectedShape = computed(
  () => savedShapes.value.find((s) => String(s?.id) === String(selectedShapeId.value)) ?? null,
)

function persistChordShapes() {
  try {
    localStorage.setItem(CHORD_SHAPES_STORAGE_KEY, JSON.stringify(savedShapes.value))
  } catch {
    // ignore persistence errors
  }
}

function loadChordShapes() {
  try {
    const raw = localStorage.getItem(CHORD_SHAPES_STORAGE_KEY)
    const parsed = JSON.parse(String(raw || '[]'))
    savedShapes.value = Array.isArray(parsed) ? parsed : []
  } catch {
    savedShapes.value = []
  }
}

function saveCurrentShape() {
  if (!canSaveCurrentShape.value) return
  const chord =
    detectedChordLabel.value && detectedChordLabel.value !== '—'
      ? detectedChordLabel.value
      : t('fretboardShow.shape')
  const stamp = new Date().toISOString().slice(11, 19)
  const id = `shape_${Date.now()}`
  const name = `${chord} ${stamp}`
  const shape = {
    id,
    name,
    chord,
    positions: currentShapePositions.value,
    createdAt: Date.now(),
  }
  savedShapes.value = [shape, ...savedShapes.value].slice(0, FRETBOARD_SHAPES.maxSavedShapes)
  selectedShapeId.value = id
  persistChordShapes()
}

function applySelectedShape() {
  if (!props.editable) return
  const shape = selectedShape.value
  if (!shape?.positions?.length) return
  let firstKey = null
  for (const pos of shape.positions) {
    const added = store.addNote(`${Number(pos.fret)}-${Number(pos.string)}`)
    if (!firstKey && added?.key) firstKey = String(added.key)
  }
  if (firstKey) selection.selectNote(firstKey)
}

function deleteSelectedShape() {
  const id = String(selectedShapeId.value || '')
  if (!id) return
  savedShapes.value = savedShapes.value.filter((s) => String(s?.id) !== id)
  selectedShapeId.value = savedShapes.value[0]?.id ? String(savedShapes.value[0].id) : ''
  persistChordShapes()
}

function selectedMovableNotes({ includeKey = '' } = {}) {
  const keysRaw = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  const keys = keysRaw.map((k) => String(k)).filter(Boolean)
  const include = String(includeKey || '')
  const hasInclude = include ? keys.includes(include) : false
  const baseKeys = hasInclude ? keys : include ? [include] : keys
  const out = []
  const seen = new Set()
  for (const key of baseKeys) {
    if (seen.has(key)) continue
    seen.add(key)
    const n = noteByKey.value.get(key)
    if (n) out.push({ key, note: n })
  }
  return out
}

const canNudgeSelection = computed(() => props.editable && selectedMovableNotes().length > 0)

function nudgeSelection(deltaFret, deltaString) {
  if (!props.editable) return
  const items = selectedMovableNotes()
  if (!items.length) return
  const maxFret = Math.max(0, Number(props.numFrets) || 12)
  const maxString = Math.max(1, Number(instrument.numStrings) || 6)
  const updates = items.map(({ key, note }) => {
    const fret = clamp((Number(note?.fret) || 0) + Number(deltaFret || 0), 0, maxFret)
    const string = clamp((Number(note?.string) || 1) + Number(deltaString || 0), 1, maxString)
    return { key, fret, string }
  })
  store.setManyPositions(updates)
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function almostInteger(v, eps = 1e-6) {
  const n = Number(v)
  if (!Number.isFinite(n)) return false
  return Math.abs(n - Math.round(n)) <= eps
}

function inferredAccentFromGrid(note) {
  const gi = Number(note?.gridIndex)
  if (!Number.isFinite(gi) || gi <= 0) return 0.6

  const beatBottom = Number(settings.beatBottom) || 4
  const beatTop = Number(settings.beatTop) || 4
  const blocksPerBeat = 4 / ([1, 2, 4, 8].includes(beatBottom) ? beatBottom : 4)
  const blocksPerBar = Math.max(1, beatTop * blocksPerBeat)
  const block0 = gi - 1
  const withinBar = ((block0 % blocksPerBar) + blocksPerBar) % blocksPerBar

  if (almostInteger(withinBar)) {
    if (Math.round(withinBar) === 0) return 1
    if (almostInteger(withinBar / blocksPerBeat)) return 0.78
  }
  return 0.58
}

const dynamicByNoteKey = computed(() => {
  const out = new Map()
  for (const note of store.activeNotes) {
    const key = String(note?.key ?? '')
    if (!key) continue

    const rawVelocity = Number(note?.velocity)
    let dyn = 0
    if (Number.isFinite(rawVelocity)) {
      // Accept either MIDI velocity 1..127 or normalized 0..1.
      dyn = rawVelocity > 1 ? rawVelocity / 127 : rawVelocity
      dyn = clamp01(dyn)
    } else {
      // Fallback if no explicit velocity exists: derive simple accent from bar/beat position.
      dyn = inferredAccentFromGrid(note)
    }

    out.set(key, dyn)
  }
  return out
})

const renderedToneDotByNoteKey = computed(() => {
  const m = new Map()
  for (const d of toneDotsForRender.value) {
    const k = noteKeyForToneDot(d)
    if (!k) continue
    if (!m.has(k)) m.set(k, d)
  }
  return m
})

function pulseAmountForNoteKey(noteKey) {
  const key = String(noteKey || '')
  if (!key) return 0
  const startedAt = Number(pulseStartedAtByNoteKey.value.get(key))
  if (!Number.isFinite(startedAt)) return 0
  const dt = animNowMs.value - startedAt
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  if (!(dt >= 0 && dt <= PULSE_MS)) return 0
  const p = dt / PULSE_MS
  return Math.sin(Math.PI * p)
}

const nowMarkers = computed(() => {
  const keys = Array.from(highlightedNoteKeySet.value || [])
  if (!keys.length) return []

  const byString = new Map()
  for (const key of keys) {
    const dot = renderedToneDotByNoteKey.value.get(String(key))
    if (!dot) continue
    const s = Number(dot?.string)
    if (!Number.isFinite(s)) continue
    const prev = byString.get(s)
    const idx = Number(dot?._stackIndex)
    const prevIdx = Number(prev?.dot?._stackIndex)
    if (!prev || (Number.isFinite(idx) && Number.isFinite(prevIdx) && idx < prevIdx)) {
      byString.set(s, { key: String(key), dot })
    }
  }

  const out = []
  for (const { key, dot } of byString.values()) {
    const pulse = pulseAmountForNoteKey(key)
    const x = toneDotX(dot)
    const y = toneDotY(dot)
    const color = toneDotFill(dot)
    out.push({
      noteKey: key,
      x,
      y,
      color,
      crossHalf: 17 + pulse * 4,
      ringR: toneDotR(dot) + 6 + pulse * 3,
      lineOpacity: 0.2 + pulse * 0.22,
    })
  }
  return out
})

const sortedNotesByStart = computed(() => {
  const items = Array.isArray(store.activeNotes) ? [...store.activeNotes] : []
  items.sort((a, b) => {
    const ga = Number(a?.gridIndex) || 0
    const gb = Number(b?.gridIndex) || 0
    if (ga !== gb) return ga - gb
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return ta - tb
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })
  return items
})

const noteStartMsByKey = computed(() => {
  const m = new Map()
  for (const n of sortedNotesByStart.value) {
    const key = String(n?.key ?? '')
    if (!key) continue
    const gridIndex = Number(n?.gridIndex)
    if (!Number.isFinite(gridIndex)) continue
    m.set(key, gridIndexToStartMs(gridIndex, DEFAULT_TIME_PER_BLOCK_MS))
  }
  return m
})

const nextNoteKeyByKey = computed(() => {
  const notes = sortedNotesByStart.value
  const out = new Map()
  for (let i = 0; i < notes.length; i++) {
    const current = notes[i]
    const currentKey = String(current?.key ?? '')
    if (!currentKey) continue
    const currentStart = noteStartMsByKey.value.get(currentKey)
    if (!Number.isFinite(currentStart)) continue

    let nextKey = null
    for (let j = i + 1; j < notes.length; j++) {
      const candidateKey = String(notes[j]?.key ?? '')
      if (!candidateKey) continue
      const candidateStart = noteStartMsByKey.value.get(candidateKey)
      if (!Number.isFinite(candidateStart)) continue
      if (candidateStart > currentStart) {
        nextKey = candidateKey
        break
      }
    }
    if (nextKey) out.set(currentKey, nextKey)
  }
  return out
})

const playbackTravelLine = computed(() => {
  if (!isPlaying.value) return null

  const latestPulse = Array.isArray(pulseStarts.value) ? pulseStarts.value[0] : null
  const fromKey = latestPulse?.key ? String(latestPulse.key) : ''
  if (!fromKey) return null

  const toKey = nextNoteKeyByKey.value.get(fromKey)
  if (!toKey) return null

  const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
  const toDot = renderedToneDotByNoteKey.value.get(toKey)
  if (!fromDot || !toDot) return null

  const fromNote = noteByKey.value.get(fromKey)
  const toNote = noteByKey.value.get(toKey)
  const sameString = Number(fromNote?.string) === Number(toNote?.string)
  const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
  if (sameString && sameFret) return null

  const startMs = Number(noteStartMsByKey.value.get(fromKey))
  const endMs = Number(noteStartMsByKey.value.get(toKey))
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null

  const spanMs = endMs - startMs
  if (!(spanMs > 0)) return null

  const nowMs = Number(playheadMs.value)
  const p = Number.isFinite(nowMs) ? (nowMs - startMs) / spanMs : 0
  const progress = Math.min(1, Math.max(0, p))

  const x1 = toneDotX(fromDot)
  const y1 = toneDotY(fromDot)
  const xTarget = toneDotX(toDot)
  const yTarget = toneDotY(toDot)
  const x2 = x1 + (xTarget - x1) * progress
  const y2 = y1 + (yTarget - y1) * progress
  const deltaFret = Number(toNote?.fret || 0) - Number(fromNote?.fret || 0)
  const deltaString = Number(toNote?.string || 0) - Number(fromNote?.string || 0)
  const absJump = Math.abs(deltaFret) + Math.abs(deltaString)
  const color =
    deltaFret > 0
      ? FRETBOARD_THEME.playbackTravel.upColor
      : deltaFret < 0
        ? FRETBOARD_THEME.playbackTravel.downColor
        : FRETBOARD_THEME.playbackTravel.sameColor
  const strokeWidth = Math.min(7.5, 2.6 + absJump * 0.55)
  const filter =
    absJump >= 4
      ? FRETBOARD_THEME.playbackTravel.highJumpFilter
      : FRETBOARD_THEME.playbackTravel.normalFilter

  return { x1, y1, x2, y2, color, strokeWidth, filter }
})

const directionPreviewSegments = computed(() => {
  if (isPlaying.value) return []
  const preview = directionPreview.value
  const keys = Array.isArray(preview?.noteKeys) ? preview.noteKeys : []
  if (keys.length < 2) return []
  const startedAt = Number(preview?.startedAtMs)
  const durationMs = Number(preview?.durationMs)
  if (!Number.isFinite(startedAt) || !Number.isFinite(durationMs) || durationMs <= 0) return []

  const dt = animNowMs.value - startedAt
  if (!(dt >= 0 && dt <= durationMs)) return []
  const fade = 1 - dt / durationMs
  const fadeOpacity = Math.max(0, Math.min(1, 0.85 * fade))
  const segmentCount = keys.length - 1
  const segmentDurationMs = durationMs / segmentCount
  const activeSegmentIndex = Math.min(segmentCount - 1, Math.floor(dt / segmentDurationMs))
  const activeSegmentElapsedMs = dt - activeSegmentIndex * segmentDurationMs
  const activeProgress = Math.max(0, Math.min(1, activeSegmentElapsedMs / segmentDurationMs))

  const out = []
  for (let i = 0; i < segmentCount; i += 1) {
    const fromKey = String(keys[i] || '')
    const toKey = String(keys[i + 1] || '')
    if (!fromKey || !toKey) continue
    const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
    const toDot = renderedToneDotByNoteKey.value.get(toKey)
    const fromNote = noteByKey.value.get(fromKey)
    const toNote = noteByKey.value.get(toKey)
    if (!fromDot || !toDot || !fromNote || !toNote) continue

    const sameString = Number(fromNote?.string) === Number(toNote?.string)
    const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
    if (sameString && sameFret) continue

    const deltaFret = Number(toNote?.fret || 0) - Number(fromNote?.fret || 0)
    const deltaString = Number(toNote?.string || 0) - Number(fromNote?.string || 0)
    const absJump = Math.abs(deltaFret) + Math.abs(deltaString)
    const color =
      deltaFret > 0
        ? FRETBOARD_THEME.playbackTravel.upColor
        : deltaFret < 0
          ? FRETBOARD_THEME.playbackTravel.downColor
          : FRETBOARD_THEME.playbackTravel.sameColor

    const xStart = toneDotX(fromDot)
    const yStart = toneDotY(fromDot)
    const xEnd = toneDotX(toDot)
    const yEnd = toneDotY(toDot)

    const isCompleted = i < activeSegmentIndex
    const isActive = i === activeSegmentIndex
    if (!isCompleted && !isActive) continue

    const x2 = isActive ? xStart + (xEnd - xStart) * activeProgress : xEnd
    const y2 = isActive ? yStart + (yEnd - yStart) * activeProgress : yEnd

    out.push({
      fromKey,
      toKey,
      x1: xStart,
      y1: yStart,
      x2,
      y2,
      color,
      opacity: isActive ? Math.max(0.55, fadeOpacity) : Math.max(0.18, fadeOpacity * 0.45),
      strokeWidth: Math.min(6.5, (isActive ? 2.6 : 1.8) + absJump * 0.45),
      filter:
        absJump >= 4
          ? FRETBOARD_THEME.playbackTravel.highJumpFilter
          : FRETBOARD_THEME.playbackTravel.normalFilter,
    })
  }

  return out
})

const playbackSelfLoop = computed(() => {
  if (!isPlaying.value) return null

  const latestPulse = Array.isArray(pulseStarts.value) ? pulseStarts.value[0] : null
  const fromKey = latestPulse?.key ? String(latestPulse.key) : ''
  if (!fromKey) return null

  const toKey = nextNoteKeyByKey.value.get(fromKey)
  if (!toKey) return null

  const fromDot = renderedToneDotByNoteKey.value.get(fromKey)
  const toDot = renderedToneDotByNoteKey.value.get(toKey)
  if (!fromDot || !toDot) return null

  const fromNote = noteByKey.value.get(fromKey)
  const toNote = noteByKey.value.get(toKey)
  const sameString = Number(fromNote?.string) === Number(toNote?.string)
  const sameFret = Number(fromNote?.fret) === Number(toNote?.fret)
  if (!(sameString && sameFret)) return null

  const startMs = Number(noteStartMsByKey.value.get(fromKey))
  const endMs = Number(noteStartMsByKey.value.get(toKey))
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null
  const spanMs = endMs - startMs
  if (!(spanMs > 0)) return null

  const nowMs = Number(playheadMs.value)
  const p = Number.isFinite(nowMs) ? (nowMs - startMs) / spanMs : 0
  const progress = Math.min(1, Math.max(0, p))

  const x = toneDotX(fromDot)
  const y = toneDotY(fromDot)
  const r = 8
  const cx = x + 14
  const cy = y - 16
  const color = toneDotFill(toDot)
  const circumference = 2 * Math.PI * r
  const dasharray = `${Math.max(0.001, circumference * progress)} ${circumference}`
  const dashoffset = `${circumference * 0.25}`
  const angle = -Math.PI / 2 + progress * 2 * Math.PI
  const headX = cx + Math.cos(angle) * r
  const headY = cy + Math.sin(angle) * r

  // Short connector from loop towards the original tone position.
  const x1 = cx - r * 0.25
  const y1 = cy + r * 0.95
  const x2 = x1 + (x + 1 - x1) * progress
  const y2 = y1 + (y - 2 - y1) * progress

  return { cx, cy, r, x1, y1, x2, y2, color, dasharray, dashoffset, headX, headY }
})

const nextNotePreviewDot = computed(() => {
  if (!isPlaying.value) return null
  const latestPulse = Array.isArray(pulseStarts.value) ? pulseStarts.value[0] : null
  const fromKey = latestPulse?.key ? String(latestPulse.key) : ''
  if (!fromKey) return null
  const toKey = nextNoteKeyByKey.value.get(fromKey)
  if (!toKey) return null
  return renderedToneDotByNoteKey.value.get(toKey) ?? null
})

const toneDotByPosKey = computed(() => {
  const m = new Map()
  for (const d of toneDotsForRender.value) {
    const key = `${Number(d.string)}-${Number(d.fret)}`
    // Pick DotQueue front (center) for show-mode selection.
    const prev = m.get(key)
    const i = Number(d?._stackIndex)
    const pi = Number(prev?._stackIndex)
    if (!prev || (Number.isFinite(i) && Number.isFinite(pi) && i < pi)) m.set(key, d)
  }
  return m
})

const hoveredFret = ref(null)
const hoveredPosKey = ref(null)
const hoveredToneDotKey = ref(null)

const hoveredPreviewToneDot = computed(() => {
  if (!props.editable) return null
  if (dragState.value?.active) return null
  const key = hoveredPosKey.value
  if (!key) return null
  if (toneDotByPosKey.value.get(key)) return null
  const [stringRaw, fretRaw] = String(key).split('-')
  const string = Number(stringRaw)
  const fret = Number(fretRaw)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  return { string, fret }
})

const dragPreviewToneDot = computed(() => {
  if (!props.editable) return null
  const s = dragState.value
  if (!s?.active) return null
  const t = s?.target
  const string = Number(t?.string)
  const fret = Number(t?.fret)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  const noteKey = s?.noteKey != null ? String(s.noteKey) : null
  if (!noteKey) return null
  return { string, fret, _noteKey: noteKey, _stackCount: 1, _stackIndex: 0 }
})

const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })
const toneDotContextMenu = ref({
  open: false,
  x: 0,
  y: 0,
  posKey: '',
  string: 0,
  fret: 0,
  items: [],
})
const textDragState = ref({
  active: false,
  pointerId: null,
  itemId: '',
})

function clampPercent(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function overlayClientToPercent(clientX, clientY) {
  const rect = overlayEl.value?.getBoundingClientRect?.()
  if (!rect) return null
  if (!(rect.width > 0) || !(rect.height > 0)) return null
  const xPct = clampPercent(((Number(clientX) - rect.left) / rect.width) * 100)
  const yPct = clampPercent(((Number(clientY) - rect.top) / rect.height) * 100)
  return { xPct, yPct }
}

function onTextItemInput(id, event) {
  const text = String(event?.target?.value ?? '')
  overlay.updateTextItemText(id, text)
}

function onTextItemDelete(id) {
  overlay.removeTextItem(id)
}

function stopTextDrag() {
  if (!textDragState.value.active) return
  textDragState.value = { active: false, pointerId: null, itemId: '' }
  window.removeEventListener('pointermove', onTextItemDragMove)
  window.removeEventListener('pointerup', onTextItemDragEnd)
  window.removeEventListener('pointercancel', onTextItemDragEnd)
}

function onTextItemDragMove(event) {
  const state = textDragState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  const p = overlayClientToPercent(event.clientX, event.clientY)
  if (!p) return
  overlay.updateTextItemPosition(state.itemId, p)
}

function onTextItemDragEnd(event) {
  const state = textDragState.value
  if (!state.active || event.pointerId !== state.pointerId) return
  stopTextDrag()
}

function onTextItemDragStart(id, event) {
  if (event.button !== 0) return
  textDragState.value = {
    active: true,
    pointerId: event.pointerId,
    itemId: String(id || ''),
  }
  window.addEventListener('pointermove', onTextItemDragMove)
  window.addEventListener('pointerup', onTextItemDragEnd)
  window.addEventListener('pointercancel', onTextItemDragEnd)
}

function removeSelectionKey(noteKey) {
  const key = String(noteKey || '')
  if (!key) return
  if (!selection.isSelected(key)) return
  const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
  const next = keys.map((k) => String(k)).filter((k) => k && k !== key)
  if (next.length) selection.setSelectedNotes(next)
  else selection.clearSelection()
}

function buildToneDotContextItems(posKey) {
  const notes = notesByPosKey.value.get(String(posKey || ''))
  if (!Array.isArray(notes) || !notes.length) return []
  const sorted = [...notes]
  sorted.sort((a, b) => {
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return tb - ta
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })
  return sorted
    .map((n) => {
      const noteKey = String(n?.key ?? '')
      if (!noteKey) return null
      const grid = Number(n?.gridIndex)
      const length = Number(n?.lengthBlocks)
      const safeLength = Number.isFinite(length) && length > 0 ? length : 1
      const label = Number.isFinite(grid)
        ? t('noteEvent.dragTooltip', {
          grid: grid.toFixed(2),
          length: Math.max(0.01, safeLength).toFixed(2),
        })
        : noteKey
      return { noteKey, label }
    })
    .filter(Boolean)
}

function closeToneDotContextMenu() {
  if (!toneDotContextMenu.value.open) return
  toneDotContextMenu.value = {
    open: false,
    x: 0,
    y: 0,
    posKey: '',
    string: 0,
    fret: 0,
    items: [],
  }
  window.removeEventListener('pointerdown', onGlobalToneDotContextPointerDown, true)
  window.removeEventListener('keydown', onGlobalToneDotContextKeyDown, true)
  window.removeEventListener('resize', closeToneDotContextMenu, true)
  window.removeEventListener('scroll', closeToneDotContextMenu, true)
}

function onGlobalToneDotContextPointerDown(event) {
  const target = event?.target
  if (target?.closest?.('.fb-tone-dot-context-menu')) return
  closeToneDotContextMenu()
}

function onGlobalToneDotContextKeyDown(event) {
  if (event?.key === 'Escape') closeToneDotContextMenu()
}

function onToneDotContextMenu(d, event) {
  const posKey = posKeyForToneDot(d)
  const items = buildToneDotContextItems(posKey)
  if (!items.length) return

  const [stringRaw, fretRaw] = String(posKey || '').split('-')
  const string = Number(stringRaw)
  const fret = Number(fretRaw)
  const margin = 8
  const menuWidth = 290
  const rowHeight = 34
  const menuHeight = 40 + items.length * rowHeight
  const vw = Number(globalThis?.innerWidth) || 0
  const vh = Number(globalThis?.innerHeight) || 0
  const xRaw = Number(event?.clientX) || 0
  const yRaw = Number(event?.clientY) || 0
  const maxX = Math.max(margin, vw - menuWidth - margin)
  const maxY = Math.max(margin, vh - menuHeight - margin)
  const x = Math.max(margin, Math.min(maxX, xRaw))
  const y = Math.max(margin, Math.min(maxY, yRaw))

  toneDotContextMenu.value = {
    open: true,
    x,
    y,
    posKey: String(posKey || ''),
    string: Number.isFinite(string) ? string : 0,
    fret: Number.isFinite(fret) ? fret : 0,
    items,
  }
  window.addEventListener('pointerdown', onGlobalToneDotContextPointerDown, true)
  window.addEventListener('keydown', onGlobalToneDotContextKeyDown, true)
  window.addEventListener('resize', closeToneDotContextMenu, true)
  window.addEventListener('scroll', closeToneDotContextMenu, true)
}

function onDeleteToneDotContextItem(noteKey) {
  const key = String(noteKey || '')
  if (!key) return
  store.removeNote(key)
  removeSelectionKey(key)
  hideTooltip()

  const posKey = String(toneDotContextMenu.value.posKey || '')
  if (!posKey) {
    closeToneDotContextMenu()
    return
  }
  const nextItems = buildToneDotContextItems(posKey)
  if (!nextItems.length) {
    closeToneDotContextMenu()
    return
  }
  toneDotContextMenu.value = {
    ...toneDotContextMenu.value,
    items: nextItems,
  }
}

function setTooltipFromEvent(event, text) {
  const rect = rootEl.value?.getBoundingClientRect?.()
  if (!rect) return

  const clientX = Number(event?.clientX)
  const clientY = Number(event?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return

  tooltip.value = {
    visible: true,
    x: Math.round(clientX - rect.left + 10),
    y: Math.round(clientY - rect.top - 28),
    text,
  }
}

function hideTooltip() {
  if (!tooltip.value.visible) return
  tooltip.value = { ...tooltip.value, visible: false }
}

function generateFretsPercent({ fretCount, scaleFrets }) {
  const n = Math.max(1, Number(fretCount) || 1)
  const fretRatio = Math.pow(2, 1 / 12)
  const frets = [0]
  for (let i = 1; i <= n; i++) {
    let x = (100 / n) * i
    if (scaleFrets) x = 100 - 100 / Math.pow(fretRatio, i)
    frets.push(x)
  }
  const last = frets[frets.length - 1] || 100
  return frets.map((x) => (x / last) * 100)
}

const fretsPct = computed(() =>
  generateFretsPercent({ fretCount: props.numFrets, scaleFrets: true }),
)
const fretLinesPx = computed(() => fretsPct.value.map((p) => (p / 100) * FB_WIDTH))

const strings = computed(() => {
  const count = Math.max(2, Number(instrument.numStrings) || 6)

  const res = []
  for (let i = 0; i < count; i++) {
    // Visual convention: top string thin, bottom string thick.
    // Keep center positions stable (do not shift y based on stroke width).
    const t = i / Math.max(1, count - 1) // 0..1
    const w = 1.2 + t * 1.6

    const y = (FB_HEIGHT / (count - 1)) * i

    // Our domain model uses 1-based string numbers.
    res.push({ string: i + 1, y, w })
  }
  return res
})

const boardY = computed(() => -BOARD_OVERHANG)
const boardH = computed(() => FB_HEIGHT + BOARD_OVERHANG * 2)
const coreResizeScale = computed(() => {
  const px = Number(props.coreResizePx) || 0
  return Math.max(FRETBOARD_RESIZE.minScale, Math.min(FRETBOARD_RESIZE.maxScale, 1 + px / CORE_RESIZE_SCALE_DIVISOR))
})
const coreResizableStyle = computed(() => ({
  transform: `scale(${coreResizeScale.value})`,
}))

const fretboardLayoutPreset = computed(() => {
  const vw = Number(viewportWidthPx.value) || 0
  if (vw <= FRETBOARD_LAYOUT_BREAKPOINTS.mobileMax) return FRETBOARD_LAYOUT_PRESETS.mobile
  if (vw <= FRETBOARD_LAYOUT_BREAKPOINTS.tabletMax) return FRETBOARD_LAYOUT_PRESETS.tablet
  return FRETBOARD_LAYOUT_PRESETS.desktop
})

const fretboardCssVars = computed(() => {
  const preset = fretboardLayoutPreset.value
  const width = preset?.width || FRETBOARD_LAYOUT_PRESETS.desktop.width
  return {
    '--fb-ui-scale': String(preset?.uiScale ?? 1),
    '--fb-side-pad-left': `${Number(preset?.sidePadLeft ?? 40)}px`,
    '--fb-side-pad-right': `${Number(preset?.sidePadRight ?? 10)}px`,
    '--fb-width-clamp': `clamp(${Number(width.minPx)}px, ${Number(width.preferredVw)}vw, ${Number(width.maxPx)}px)`,
    '--fb-gap-px': `${Number(FRETBOARD_UI_TOKENS.gapPx)}px`,
    '--fb-control-h-px': `${Number(FRETBOARD_UI_TOKENS.controlHeightPx)}px`,
    '--fb-font-sm-px': `${Number(FRETBOARD_UI_TOKENS.fontSmallPx)}px`,
    '--fb-top-pad': `${Number(FRETBOARD_UI_TOKENS.topPadPx)}px`,
    '--fb-bottom-pad': `${Number(FRETBOARD_UI_TOKENS.bottomPadPx)}px`,
    '--fb-numbers-height-px': `${Number(FRETBOARD_UI_TOKENS.numbersHeightPx)}px`,
    '--fb-numbers-pad-top-px': `${Number(FRETBOARD_UI_TOKENS.numbersPadTopPx)}px`,
    '--fb-numbers-margin-top': `${Number(FRETBOARD_UI_TOKENS.numbersMarginTopPx)}px`,
    '--fb-numbers-margin-bottom': `${Number(FRETBOARD_UI_TOKENS.numbersMarginBottomPx)}px`,
    '--fb-actions-margin-top': `${Number(FRETBOARD_UI_TOKENS.actionsMarginTopPx)}px`,
    '--fb-actions-margin-bottom': `${Number(FRETBOARD_UI_TOKENS.actionsMarginBottomPx)}px`,
    '--fb-rail-top-pad-px': `${Number(FRETBOARD_UI_TOKENS.railTopPadPx)}px`,
    '--fb-playback-travel-line-shadow': FRETBOARD_THEME.css.playbackTravelLineShadow,
    '--fb-now-cross-shadow': FRETBOARD_THEME.css.nowCrossShadow,
    '--fb-now-ring-shadow': FRETBOARD_THEME.css.nowRingShadow,
    '--fb-self-loop-shadow': FRETBOARD_THEME.css.selfLoopShadow,
    '--fb-self-loop-head-shadow': FRETBOARD_THEME.css.selfLoopHeadShadow,
    '--fb-tone-dot-symbol-fill': FRETBOARD_THEME.css.toneDotSymbolFill,
    '--fb-tone-dot-symbol-stroke': FRETBOARD_THEME.css.toneDotSymbolStroke,
    '--fb-tone-dot-pitch-fill': FRETBOARD_THEME.css.toneDotPitchFill,
    '--fb-tone-dot-pitch-stroke': FRETBOARD_THEME.css.toneDotPitchStroke,
    '--fb-next-note-preview-stroke': FRETBOARD_THEME.css.nextNotePreviewStroke,
    '--fb-next-note-preview-shadow': FRETBOARD_THEME.css.nextNotePreviewShadow,
    '--fb-fret-number-color': FRETBOARD_THEME.css.fretNumberColor,
    '--fb-fret-number-shadow': FRETBOARD_THEME.css.fretNumberShadow,
    '--fb-fret-number-marker-color': FRETBOARD_THEME.css.fretNumberMarkerColor,
    '--fb-fret-number-marker-shadow': FRETBOARD_THEME.css.fretNumberMarkerShadow,
    '--fb-tooltip-bg': FRETBOARD_THEME.css.tooltipBg,
    '--fb-tooltip-text': FRETBOARD_THEME.css.tooltipText,
    '--fb-hand-overlay-fill': FRETBOARD_THEME.css.handOverlayFill,
    '--fb-hand-overlay-stroke': FRETBOARD_THEME.css.handOverlayStroke,
    '--fb-hand-overlay-shadow': FRETBOARD_THEME.css.handOverlayShadow,
    '--fb-hand-suggested-fill': FRETBOARD_THEME.css.handSuggestedFill,
    '--fb-hand-suggested-stroke': FRETBOARD_THEME.css.handSuggestedStroke,
    '--fb-hand-suggested-text-fill': FRETBOARD_THEME.css.handSuggestedTextFill,
    '--fb-hand-suggested-text-stroke': FRETBOARD_THEME.css.handSuggestedTextStroke,
    '--fb-hand-info-text': FRETBOARD_THEME.css.handInfoText,
    '--fb-hand-info-warning-text': FRETBOARD_THEME.css.handInfoWarningText,
    '--fb-chord-detected-text': FRETBOARD_THEME.css.chordDetectedText,
    '--fb-chord-detected-bg': FRETBOARD_THEME.css.chordDetectedBg,
    '--fb-chord-detected-border': FRETBOARD_THEME.css.chordDetectedBorder,
    '--fb-chord-detected-shadow': FRETBOARD_THEME.css.chordDetectedShadow,
    '--fb-shape-control-border': FRETBOARD_THEME.css.shapeControlBorder,
    '--fb-shape-control-bg': FRETBOARD_THEME.css.shapeControlBg,
    '--fb-shape-control-text': FRETBOARD_THEME.css.shapeControlText,
    '--fb-shape-danger-border': FRETBOARD_THEME.css.shapeDangerBorder,
    '--fb-shape-danger-text': FRETBOARD_THEME.css.shapeDangerText,
    '--fb-shape-active-border': FRETBOARD_THEME.css.shapeActiveBorder,
    '--fb-shape-active-bg': FRETBOARD_THEME.css.shapeActiveBg,
    '--fb-shape-active-text': FRETBOARD_THEME.css.shapeActiveText,
    '--fb-color-swatch-border': FRETBOARD_THEME.css.colorSwatchBorder,
  }
})

function onViewportResize() {
  viewportWidthPx.value = Number(globalThis?.innerWidth) || 1440
}

function dotMidXForFret(fret) {
  const f = Math.max(0, Math.min(Number(fret) || 0, fretsPct.value.length - 1))
  if (f === 0) return 0
  const a = fretsPct.value[f - 1] ?? 0
  const b = fretsPct.value[f] ?? 0
  const mid = b - (b - a) / 2
  return (mid / 100) * FB_WIDTH
}

const inlayDots = computed(() => {
  const inlays = FRETBOARD_INLAYS.frets
  const maxF = Math.max(0, Number(props.numFrets) || 0)
  const inside = inlays.filter((f) => f <= maxF)

  const out = []
  const midY = FB_HEIGHT / 2
  for (const f of inside) {
    const x = dotMidXForFret(f)
    const isDouble = FRETBOARD_INLAYS.doubleFrets.includes(f)
    const r = FRETBOARD_INLAYS.radiusPx
    if (isDouble) {
      out.push({ key: `inlay-${f}-a`, x, y: midY - FRETBOARD_INLAYS.doubleOffsetYPx, r })
      out.push({ key: `inlay-${f}-b`, x, y: midY + FRETBOARD_INLAYS.doubleOffsetYPx, r })
    } else {
      out.push({ key: `inlay-${f}`, x, y: midY, r })
    }
  }
  return out
})

const harmonyGuideDots = computed(() => {
  const useChord = Boolean(showChord.value)
  const useScale = Boolean(showScale.value)
  if (!useChord && !useScale) return []

  const chordSet =
    useChord && chordPitchClasses.value instanceof Set ? chordPitchClasses.value : new Set()
  const scaleSet =
    useScale && scalePitchClasses.value instanceof Set ? scalePitchClasses.value : new Set()
  if (!chordSet.size && !scaleSet.size) return []

  const fromFret = Math.max(
    0,
    Number(patternFretRange.value?.fromFret) || 0,
    fretViewRange.value.from,
  )
  const toFretRaw = Number(patternFretRange.value?.toFret)
  const toFretByPattern = Number.isFinite(toFretRaw) ? Math.max(fromFret, toFretRaw) : Infinity
  const toFret = Math.min(toFretByPattern, fretViewRange.value.to)

  const maxFret = Math.max(0, Number(props.numFrets) || 12)
  const out = []
  for (const s of strings.value) {
    const string = Number(s?.string)
    if (!Number.isFinite(string)) continue

    for (let fret = 0; fret <= maxFret; fret += 1) {
      if (fret < fromFret || fret > toFret) continue
      const midi = midiForFretString({ fret, string }, tuning.value)
      if (!Number.isFinite(Number(midi))) continue
      const pc = ((Number(midi) % 12) + 12) % 12
      const inChord = useChord && chordSet.has(pc)
      const inScale = useScale && scaleSet.has(pc)
      if (!inChord && !inScale) continue
      out.push({ string, fret, inChord, inScale, pc })
    }
  }
  return out
})

function parseFretRange(rawLabel) {
  const text = String(rawLabel ?? '').trim()
  const m = text.match(/^(\d+)\s*-\s*(\d+)$/)
  if (!m) return { fromFret: 1, toFret: 4 }
  const a = Number(m[1])
  const b = Number(m[2])
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { fromFret: 1, toFret: 4 }
  const min = Math.max(1, Math.min(a, b))
  const max = Math.max(min, Math.max(a, b))
  return { fromFret: min, toFret: max }
}

const activeHandPosition = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t)) return null

  const items = Array.isArray(handPositions.value) ? handPositions.value : []
  let best = null
  let bestStart = -Infinity
  for (const hp of items) {
    const gridIndex = Number(hp?.gridIndex)
    const lengthBlocks = Number(hp?.lengthBlocks)
    if (!Number.isFinite(gridIndex) || !Number.isFinite(lengthBlocks)) continue
    if (!(gridIndex > 0) || !(lengthBlocks > 0)) continue

    const startMs = gridIndexToStartMs(gridIndex, DEFAULT_TIME_PER_BLOCK_MS)
    const endMs = startMs + lengthBlocksToDurationMs(lengthBlocks, DEFAULT_TIME_PER_BLOCK_MS)
    if (!(t >= startMs && t < endMs)) continue

    if (startMs >= bestStart) {
      bestStart = startMs
      best = hp
    }
  }
  return best
})

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

const timelineNoteEntries = computed(() => {
  const out = []
  for (const n of sortedNotesByStart.value) {
    const key = String(n?.key ?? '')
    if (!key) continue
    const startMs = Number(noteStartMsByKey.value.get(key))
    if (!Number.isFinite(startMs)) continue
    const lenRaw = Number(n?.lengthBlocks)
    const len = Number.isFinite(lenRaw) && lenRaw > 0 ? lenRaw : 1
    const endMs = startMs + lengthBlocksToDurationMs(len, DEFAULT_TIME_PER_BLOCK_MS)
    out.push({ key, note: n, startMs, endMs })
  }
  return out
})

const playbackTimelineIndex = computed(() => {
  const t = Number(playheadMs.value)
  if (!Number.isFinite(t)) return -1
  const entries = timelineNoteEntries.value
  if (!entries.length) return -1
  let idx = -1
  for (let i = 0; i < entries.length; i += 1) {
    if (t >= entries[i].startMs) idx = i
    else break
  }
  return idx
})

const focusNoteForHandMode = computed(() => {
  const selected = String(selection.selectedNoteKey || '')
  if (selected) {
    const n = noteByKey.value.get(selected)
    if (n) return n
  }

  const highlighted = Array.isArray(highlightedNoteKeys.value) ? highlightedNoteKeys.value : []
  for (const k of highlighted) {
    const n = noteByKey.value.get(String(k))
    if (n) return n
  }

  const idx = playbackTimelineIndex.value
  if (idx >= 0) return timelineNoteEntries.value[idx]?.note ?? null
  return null
})

const suggestedHandPositionRange = computed(() => {
  if (!settings.showSuggestedPosition) return null
  if (activeHandPosition.value) return null
  const note = focusNoteForHandMode.value
  const fretRaw = Number(note?.fret)
  if (!Number.isFinite(fretRaw)) return null

  const maxFret = Math.max(1, Number(props.numFrets) || 12)
  const toSpan = FRETBOARD_HAND_POSITION.suggestedSpanFrets
  const startMax = Math.max(1, maxFret - toSpan)
  const fromFret = clamp(Math.round(fretRaw) - 1, 1, startMax)
  const toFret = clamp(fromFret + toSpan, fromFret, maxFret)
  return { fromFret, toFret }
})

const handPositionOverlayRect = computed(() => {
  const hp = activeHandPosition.value
  if (!hp) return null

  const { fromFret, toFret } = parseFretRange(hp?.fret)
  const maxFret = Math.max(1, Number(props.numFrets) || 12)
  const startFret = Math.min(maxFret, Math.max(1, fromFret))
  const endFret = Math.min(maxFret, Math.max(startFret, toFret))

  const topY = Number(strings.value[0]?.y)
  const bottomY = Number(strings.value[strings.value.length - 1]?.y)
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY)) return null

  const lines = fretLinesPx.value
  const xLeft = startFret <= 1 ? NUT_WIDTH : Number(lines[startFret - 1] ?? NUT_WIDTH)
  const xRight = Number(lines[endFret] ?? FB_WIDTH)
  if (!(xRight > xLeft)) return null

  const padY = FRETBOARD_HAND_POSITION.activePadYPx
  const y = topY - padY
  const height = bottomY - topY + padY * 2
  return { x: xLeft, y, width: xRight - xLeft, height, rx: 10 }
})

const suggestedHandPositionOverlayRect = computed(() => {
  const range = suggestedHandPositionRange.value
  if (!range) return null
  const { fromFret, toFret } = range

  const topY = Number(strings.value[0]?.y)
  const bottomY = Number(strings.value[strings.value.length - 1]?.y)
  if (!Number.isFinite(topY) || !Number.isFinite(bottomY)) return null

  const lines = fretLinesPx.value
  const xLeft = fromFret <= 1 ? NUT_WIDTH : Number(lines[fromFret - 1] ?? NUT_WIDTH)
  const xRight = Number(lines[toFret] ?? FB_WIDTH)
  if (!(xRight > xLeft)) return null

  const padY = FRETBOARD_HAND_POSITION.suggestedPadYPx
  const y = topY - padY
  const height = bottomY - topY + padY * 2
  return {
    x: xLeft,
    y,
    width: xRight - xLeft,
    height,
    rx: 9,
    fromFret,
    toFret,
    labelX: xLeft + FRETBOARD_HAND_POSITION.suggestedLabelOffsetXPx,
    labelY: y + FRETBOARD_HAND_POSITION.suggestedLabelOffsetYPx,
  }
})

const handModeInfoText = computed(() => {
  const range = settings.showSuggestedPosition ? suggestedHandPositionRange.value : null
  if (range)
    return t('fretboardShow.suggestedHandPosition', { from: range.fromFret, to: range.toFret })
  const hp = activeHandPosition.value
  if (!hp) return ''
  return t('fretboardShow.activeHandPosition', { fret: String(hp?.fret ?? '') })
})

const handModeWarningText = computed(() => {
  const idx = playbackTimelineIndex.value
  if (idx <= 0) return ''
  const entries = timelineNoteEntries.value
  const cur = entries[idx]?.note
  const prev = entries[idx - 1]?.note
  if (!cur || !prev) return ''
  const df = Math.abs((Number(cur?.fret) || 0) - (Number(prev?.fret) || 0))
  const ds = Math.abs((Number(cur?.string) || 0) - (Number(prev?.string) || 0))
  const hardJump = df >= 6 || (df >= 4 && ds >= 2)
  if (!hardJump) return ''
  const tail = ds ? t('fretboardShow.warningStringsPart', { strings: ds }) : ''
  return t('fretboardShow.warningLargeJump', { frets: df, tail })
})

const fretLabels = computed(() => {
  const max = Math.max(0, Number(props.numFrets) || 0)
  const lines = fretLinesPx.value
  const out = []
  const view = fretViewRange.value

  // Labels should be centered under the fret fields (1..n).
  // Fret 1 is between nut and the first fret line.
  for (let fret = Math.max(1, view.from); fret <= Math.min(max, view.to); fret++) {
    const left = fret === 1 ? NUT_WIDTH : Number(lines[fret - 1] ?? 0)
    const right = Number(lines[fret] ?? FB_WIDTH)
    const x = (left + right) / 2
    out.push({ fret, xPct: (x / FB_WIDTH) * 100 })
  }

  return out
})

function xToFret(x) {
  const v = Number(x)
  if (!Number.isFinite(v)) return 0
  if (v <= NUT_WIDTH) return 0
  const lines = fretLinesPx.value
  const max = Number(props.numFrets) || 12
  // Map x to fret-field: between nut and fret-1-line => fret 1, between fret (n-1) and fret n => fret n.
  for (let i = 1; i <= max; i++) {
    const xi = Number(lines[i] ?? Infinity)
    if (v < xi) return i
  }
  return max
}

function yToString(y) {
  const v = Number(y)
  if (!Number.isFinite(v)) return 1
  let best = strings.value[0]?.string ?? 1
  let bestDist = Infinity
  for (const s of strings.value) {
    const d = Math.abs(v - Number(s.y))
    if (d < bestDist) {
      bestDist = d
      best = s.string
    }
  }
  return best
}

function clientToSvgPoint(event) {
  const el = overlayEl.value
  if (!el?.getBoundingClientRect) return null
  const rect = el.getBoundingClientRect()
  const clientX = Number(event?.clientX)
  const clientY = Number(event?.clientY)
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null

  const x = ((clientX - rect.left) / rect.width) * FB_WIDTH
  const yRaw = boardY.value + ((clientY - rect.top) / rect.height) * boardH.value
  const y = clamp(yRaw, 0, FB_HEIGHT)
  return { x, y }
}

function hoveredPosFromEvent(event) {
  const p = clientToSvgPoint(event)
  if (!p) return null
  const fret = xToFret(p.x)
  if (!isFretInView(fret)) return null
  const string = yToString(p.y)
  return { fret, string }
}

function onClick(event) {
  if (Date.now() < suppressClicksUntilMs) return
  if (placementArmed.value) {
    const p = overlayClientToPercent(event?.clientX, event?.clientY)
    overlay.setPlacementArmed(false)
    if (p) {
      overlay.addTextItem({ ...p, text: '' })
      return
    }
  }
  const pos = hoveredPosFromEvent(event)
  if (!pos) return
  const { fret, string } = pos

  if (props.editable) {
    if (settings.eraseMode) {
      const existing = toneDotByPosKey.value.get(`${string}-${fret}`)
      const noteKey = String(existing?._noteKey || '')
      if (noteKey) {
        store.removeNote(noteKey)
        const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
        const next = keys.filter((k) => String(k) !== noteKey)
        if (next.length) selection.setSelectedNotes(next)
        else if (selection.selectedNoteKey === noteKey) selection.clearSelection()
      }
      return
    }
    const note = store.addNote(`${fret}-${string}`)
    if (note?.key) selection.selectNote(note.key)

    if (!settings.soundPreviewEnabled) return
    const t = tuning.value
    const midi = midiForFretString({ fret, string }, t)
    if (Number.isFinite(Number(midi))) {
      const durationPlayheadMs = store.getNoteDurationMs(note)

      const tempoValue = Number(transport.tempo) || 120
      const tempoScale = 120 / tempoValue
      const durScale = Number(settings.soundDurationScale)
      const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
      const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

      void playMidi(midi, {
        durationMs: durationAudioMs,
        instrumentType: instrument.instrumentType,
      })
    }
    return
  }

  // Show-mode: only allow selecting/previewing existing notes.
  const d = toneDotByPosKey.value.get(`${string}-${fret}`)
  if (!d?._noteKey) return

  selection.selectNote(d._noteKey)
  if (!settings.soundPreviewEnabled) return
  const t = tuning.value
  const midi = midiForFretString({ fret, string }, t)
  if (Number.isFinite(Number(midi))) {
    const note = store.activeNotes.find((n) => n?.key === d._noteKey)
    const durationPlayheadMs = store.getNoteDurationMs(note)

    const tempoValue = Number(transport.tempo) || 120
    const tempoScale = 120 / tempoValue
    const durScale = Number(settings.soundDurationScale)
    const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
    const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

    void playMidi(midi, { durationMs: durationAudioMs, instrumentType: instrument.instrumentType })
  }
}

function onMouseMove(event) {
  // If the pointer is currently inside a dot, keep hover stable.
  if (hoveredToneDotKey.value) {
    if (tooltip.value.visible) setTooltipFromEvent(event, tooltip.value.text)
    return
  }

  const pos = hoveredPosFromEvent(event)
  if (!pos) return
  const { fret, string } = pos
  const nextKey = `${string}-${fret}`
  const samePos = hoveredPosKey.value === nextKey

  hoveredFret.value = fret
  hoveredPosKey.value = nextKey

  const t = tuning.value
  const midi = midiForFretString({ fret, string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (!text) {
    hideTooltip()
    return
  }

  // In Show: Tooltip only where a note exists. In Edit: always show hovered pitch.
  if (!props.editable) {
    const d = toneDotByPosKey.value.get(nextKey)
    if (!d) {
      hideTooltip()
      return
    }
  }

  const nextText = !samePos || tooltip.value.text !== text ? text : tooltip.value.text
  setTooltipFromEvent(event, nextText)
}

function onMouseLeave() {
  if (hoveredFret.value === null) return
  hoveredFret.value = null
  hoveredPosKey.value = null
  hoveredToneDotKey.value = null
  hideTooltip()
}

const DOT_BASE_R = FRETBOARD_TONE_DOTS.baseRadiusPx
const DOT_HOVER_R_FACTOR = FRETBOARD_TONE_DOTS.hoverRadiusFactor

function posKeyForToneDot(d) {
  return `${Number(d?.string)}-${Number(d?.fret)}`
}

function noteKeyForToneDot(d) {
  return d?._noteKey ? String(d._noteKey) : null
}

function hoverKeyForToneDot(d) {
  return noteKeyForToneDot(d) ?? posKeyForToneDot(d)
}

function isToneDotHovered(d) {
  const key = hoverKeyForToneDot(d)
  return hoveredToneDotKey.value === key
}

function onToneDotEnter(d, event) {
  const key = hoverKeyForToneDot(d)
  hoveredToneDotKey.value = key
  hoveredPosKey.value = posKeyForToneDot(d)
  hoveredFret.value = Number(d?.fret)

  const t = tuning.value
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (text) setTooltipFromEvent(event, text)
}

function onToneDotLeave(d) {
  const key = hoverKeyForToneDot(d)
  if (hoveredToneDotKey.value === key) hoveredToneDotKey.value = null
  // leave hoveredPosKey to mousemove (field hover) or mouseleave
  hideTooltip()
}

function onToneDotClick(d, event) {
  if (event?.button != null && event.button !== 0) return
  if (Date.now() < suppressClicksUntilMs) return
  const noteKey = noteKeyForToneDot(d)
  if (!noteKey) return
  if (settings.eraseMode) {
    event?.stopPropagation?.()
    store.removeNote(noteKey)
    const keys = Array.isArray(selection.selectedNoteKeys) ? selection.selectedNoteKeys : []
    const next = keys.filter((k) => String(k) !== String(noteKey))
    if (next.length) selection.setSelectedNotes(next)
    else selection.clearSelection()
    return
  }

  const isShift = Boolean(event?.shiftKey)

  // In edit mode, a normal click should still add a new note (stacking), so we let it bubble.
  // Shift-click toggles selection without creating a note.
  // In show mode, clicking a ToneDot should always address exactly this dot.
  if (!props.editable || isShift) event?.stopPropagation?.()

  if (isShift) selection.toggleNoteInSelection(noteKey)
  else selection.selectNote(noteKey)

  // Preview sound only on normal click (matching existing behavior).
  if (isShift || !settings.soundPreviewEnabled) return

  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const t = tuning.value
  const midi = midiForFretString({ fret, string }, t)
  if (!Number.isFinite(Number(midi))) return

  const note = store.activeNotes.find((n) => String(n?.key ?? '') === String(noteKey))
  const durationPlayheadMs = store.getNoteDurationMs(note)

  const tempoValue = Number(transport.tempo) || 120
  const tempoScale = 120 / tempoValue
  const durScale = Number(settings.soundDurationScale)
  const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
  const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

  void playMidi(midi, { durationMs: durationAudioMs, instrumentType: instrument.instrumentType })
}

function clearLongPressTimer() {
  if (longPressTimer == null) return
  clearTimeout(longPressTimer)
  longPressTimer = null
}

function onToneDotPointerDown(d, event) {
  if (event?.button != null && event.button !== 0) return
  if (!props.editable) return
  if (isPlaying.value) return

  const noteKey = noteKeyForToneDot(d)
  if (!noteKey) return

  const pointerId = event?.pointerId
  if (pointerId == null) return

  clearLongPressTimer()
  dragState.value = {
    active: false,
    noteKey: String(noteKey),
    pointerId,
    startAtMs: Date.now(),
    target: hoveredPosFromEvent(event),
  }

  // Activate drag only after a long press.
  longPressTimer = setTimeout(() => {
    const s = dragState.value
    if (!s?.noteKey) return
    if (s.pointerId !== pointerId) return
    dragState.value = { ...s, active: true }
  }, LONG_PRESS_MS)

  event?.currentTarget?.setPointerCapture?.(pointerId)
}

function onToneDotPointerMove(event) {
  const s = dragState.value
  if (!s?.noteKey) return
  if (event?.pointerId !== s.pointerId) return

  if (!s.active) return

  const pos = hoveredPosFromEvent(event)
  if (!pos) return

  dragState.value = { ...s, target: pos }

  const t = tuning.value
  const midi = midiForFretString({ fret: pos.fret, string: pos.string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (text) setTooltipFromEvent(event, text)
}

function onToneDotPointerUp(event) {
  const s = dragState.value
  if (!s?.noteKey) return
  if (event?.pointerId !== s.pointerId) return

  clearLongPressTimer()

  if (s.active) {
    const target = s.target ?? hoveredPosFromEvent(event)
    if (target) {
      const src = noteByKey.value.get(String(s.noteKey))
      const srcFret = Number(src?.fret)
      const srcString = Number(src?.string)
      const moved =
        Number.isFinite(srcFret) &&
        Number.isFinite(srcString) &&
        (Number(target.fret) !== srcFret || Number(target.string) !== srcString)
      const maxFret = Math.max(0, Number(props.numFrets) || 12)
      const maxString = Math.max(1, Number(instrument.numStrings) || 6)

      const selectedItems = selectedMovableNotes({ includeKey: s.noteKey })
      const useGroup =
        selectedItems.length > 1 &&
        selectedItems.some((x) => String(x.key) === String(s.noteKey)) &&
        Number.isFinite(srcFret) &&
        Number.isFinite(srcString)

      if (useGroup) {
        const deltaFret = Number(target.fret) - srcFret
        const deltaString = Number(target.string) - srcString
        const updates = selectedItems.map(({ key, note }) => ({
          key,
          fret: clamp((Number(note?.fret) || 0) + deltaFret, 0, maxFret),
          string: clamp((Number(note?.string) || 1) + deltaString, 1, maxString),
        }))
        store.setManyPositions(updates)
      } else {
        store.setNotePosition(s.noteKey, { fret: target.fret, string: target.string })
      }
      selection.selectNote(s.noteKey)

      if (moved && settings.soundPreviewEnabled) {
        const midi = midiForFretString(
          { fret: Number(target.fret), string: Number(target.string) },
          tuning.value,
        )
        if (Number.isFinite(Number(midi))) {
          const durationPlayheadMs = store.getNoteDurationMs(src)
          const tempoValue = Number(transport.tempo) || 120
          const tempoScale = 120 / tempoValue
          const durScale = Number(settings.soundDurationScale)
          const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
          const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)
          void playMidi(midi, {
            durationMs: durationAudioMs,
            instrumentType: instrument.instrumentType,
          })
        }
      }
    }

    // Prevent the subsequent click (which would otherwise add a note in edit mode).
    suppressClicksUntilMs = Date.now() + CLICK_SUPPRESS_MS
    event?.preventDefault?.()
    event?.stopPropagation?.()
  }

  dragState.value = { active: false, noteKey: null, pointerId: null, startAtMs: 0, target: null }
  hideTooltip()
}

function toneDotX(d) {
  const fret = Math.max(0, Number(d?.fret) || 0)
  const lines = fretLinesPx.value
  const max = Math.min(fret, Number(props.numFrets) || 12)

  // Open-string ToneDot: on the nut.
  if (max === 0) return NUT_WIDTH / 2 + toneDotOffset(d).dx

  // Fret n ToneDot belongs to the field between (n-1) and n.
  const left = max === 1 ? NUT_WIDTH : Number(lines[max - 1] ?? 0)
  const right = Number(lines[max] ?? FB_WIDTH)
  return (left + right) / 2 + toneDotOffset(d).dx
}

function toneDotY(d) {
  const string = Number(d?.string)
  const s = strings.value.find((x) => Number(x.string) === string)
  return Number(s?.y) || 0
}

function harmonyGuideFill(d) {
  if (d?.inChord && d?.inScale) return FRETBOARD_THEME.harmonyGuides.fillBoth
  if (d?.inChord) return FRETBOARD_THEME.harmonyGuides.fillChord
  return 'transparent'
}

function harmonyGuideStroke(d) {
  if (d?.inChord && d?.inScale) return FRETBOARD_THEME.harmonyGuides.strokeBoth
  if (d?.inChord) return FRETBOARD_THEME.harmonyGuides.strokeChord
  return FRETBOARD_THEME.harmonyGuides.strokeScale
}

function harmonyGuideStrokeWidth(d) {
  if (d?.inChord && d?.inScale) return 2.3
  if (d?.inChord) return 1.9
  return 1.5
}

function harmonyGuideRadius(d) {
  if (d?.inChord && d?.inScale) return 9.2
  if (d?.inChord) return 8
  return 6
}

function toneDotOffset(d) {
  const count = Number(d?._stackCount) || 1
  if (count <= 1) return { dx: 0, dy: 0 }

  const iRaw = Number(d?._stackIndex) || 0
  const i = Math.max(0, Math.floor(iRaw))

  // Only horizontal offsets (requested): keep y aligned to the string.
  // Stack direction: only to the left.
  // Queue front is centered (dx=0); subsequent items shift left by OX each.
  const OX = FRETBOARD_INTERACTION.toneDotStackOffsetXPx
  return { dx: -i * OX, dy: 0 }
}

function toneDotFill(d) {
  return d?.color ?? 'white'
}

function deriveNoteValueFromLength(note) {
  const len = Number(note?.lengthBlocks)
  if (!Number.isFinite(len) || len <= 0) return '1/4'

  const subdivision = Number(note?.subdivision) === 3 ? 3 : 2
  const candidates = []
  for (const item of NOTE_VALUE_ITEMS) {
    const base = Number(item?.baseBlocks)
    if (!Number.isFinite(base) || base <= 0) continue
    candidates.push({ value: item.value, length: base })
    if (base > 0.25) candidates.push({ value: item.value, length: base * 1.5 })
    if (subdivision === 3) candidates.push({ value: item.value, length: base * (2 / 3) })
  }

  let best = { value: '1/4', delta: Infinity }
  for (const c of candidates) {
    const delta = Math.abs(len - c.length)
    if (delta < best.delta) best = { value: c.value, delta }
  }
  return best.value
}

function noteValueForToneDot(d) {
  const nk = noteKeyForToneDot(d)
  if (!nk) return ''

  const note = noteByKey.value.get(nk)
  const direct = normalizeNoteValue(note?.noteValue)
  if (direct) return direct
  return deriveNoteValueFromLength(note)
}

const NOTE_TO_PC = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
}

const INTERVAL_LABELS = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7']

function rootPitchClassForIntervals() {
  const raw = String(scaleRoot.value || chordRoot.value || 'C').trim().toUpperCase()
  return NOTE_TO_PC[raw] ?? 0
}

function intervalLabelForToneDot(d) {
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, tuning.value)
  if (!Number.isFinite(Number(midi))) return ''
  const pc = ((Number(midi) % 12) + 12) % 12
  const rootPc = rootPitchClassForIntervals()
  const intervalPc = (pc - rootPc + 12) % 12
  return INTERVAL_LABELS[intervalPc] || ''
}

function toneDotSymbol(d) {
  if (settings.showIntervalsOnDots) {
    return intervalLabelForToneDot(d)
  }
  const value = noteValueForToneDot(d)
  if (!value) return ''
  const item = noteValueItem(value)
  return item?.dotSymbol || item?.label || value
}

function toneDotIcon(d) {
  if (settings.showIntervalsOnDots) return ''
  const value = noteValueForToneDot(d)
  if (!(value === '1/2' || value === '1')) return ''
  const item = noteValueItem(value)
  return String(item?.icon || '')
}

function toneDotPitchLabel(d) {
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, tuning.value)
  if (!Number.isFinite(Number(midi))) return ''
  return midiToNoteName(midi, { includeOctave: false })
}

function showPitchLabel(d) {
  const nk = noteKeyForToneDot(d)
  return Boolean(nk && (highlightedNoteKeySet.value.has(nk) || isToneDotHovered(d)))
}

function isMarkerFret(fret) {
  const f = Number(fret)
  if (!Number.isFinite(f) || f <= 0) return false
  return f % 12 === 0 || [3, 5, 7, 9].includes(f % 12)
}

function toneDotOpacity(d) {
  const nk = noteKeyForToneDot(d)
  const dyn = nk ? Number(dynamicByNoteKey.value.get(nk)) : NaN
  const dynOpacity = Number.isFinite(dyn) ? 0.48 + dyn * 0.52 : 1

  if (!isPlaying.value) return dynOpacity
  if (!nk) return FRETBOARD_SHOW_DOT_BASE_OPACITY_WHILE_PLAYING
  return highlightedNoteKeySet.value.has(nk) || playedNoteKeys.value.has(nk)
    ? 1
    : Math.max(FRETBOARD_SHOW_DOT_BASE_OPACITY_WHILE_PLAYING, dynOpacity * 0.72)
}

function toneDotStroke(d) {
  const hk = hoverKeyForToneDot(d)
  const hoverStroke =
    hoveredToneDotKey.value === hk
      ? FRETBOARD_THEME.toneDots.strokeHover
      : FRETBOARD_THEME.toneDots.strokeDefault

  const nk = noteKeyForToneDot(d)
  if (nk && String(selection.selectedNoteKey || '') === nk) return FRETBOARD_THEME.toneDots.strokeHover

  return hoverStroke
}

function toneDotStrokeWidth(d) {
  const hk = hoverKeyForToneDot(d)
  let w = hoveredToneDotKey.value === hk ? 1.8 : 1.2

  if (isToneDotHovered(d)) w = Math.max(w, 1.8)

  const nk = noteKeyForToneDot(d)
  if (nk && String(selection.selectedNoteKey || '') === nk) w = Math.max(w, 1.8)
  const dyn = nk ? Number(dynamicByNoteKey.value.get(nk)) : NaN
  if (Number.isFinite(dyn)) w += dyn * 0.35
  return w
}

function toneDotR(d) {
  const hk = hoverKeyForToneDot(d)
  const nk = noteKeyForToneDot(d)
  const isActive =
    Boolean(nk) &&
    (String(selection.selectedNoteKey || '') === String(nk) ||
      highlightedNoteKeySet.value.has(String(nk)))
  const dyn = nk ? Number(dynamicByNoteKey.value.get(nk)) : NaN
  const dynScale = Number.isFinite(dyn) ? 0.82 + dyn * 0.42 : 1
  const baseR = DOT_BASE_R * dynScale * (hoveredToneDotKey.value === hk ? DOT_HOVER_R_FACTOR : 1)
  const startedAt = nk ? pulseStartedAtByNoteKey.value.get(nk) : null
  if (!Number.isFinite(startedAt)) {
    if (isActive) return baseR * 1.12
    return baseR
  }

  const dt = animNowMs.value - startedAt
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  if (!(dt >= 0 && dt <= PULSE_MS)) {
    if (isActive) return baseR * 1.12
    return baseR
  }
  const p = dt / PULSE_MS
  const bump = Math.sin(Math.PI * p)
  const pulseR = baseR * (1 + FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR * bump)
  if (isActive) return pulseR * 1.12
  return pulseR
}

function toneDotStyle(d) {
  const nk = noteKeyForToneDot(d)
  if (!nk) return null
  const selected = String(selection.selectedNoteKey || '') === nk
  const highlighted = highlightedNoteKeySet.value.has(nk)
  if (!selected && !highlighted) return null
  return {
    filter: selected
      ? 'drop-shadow(0 0 5px rgba(255, 235, 170, 0.92)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45))'
      : 'drop-shadow(0 0 4px rgba(255, 220, 120, 0.86)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.42))',
  }
}

function previewR() {
  // Keep preview a touch smaller than a fully hovered active ToneDot.
  return DOT_BASE_R * FRETBOARD_TONE_DOTS.previewRadiusFactor
}

onMounted(() => {
  animNowMs.value = performance.now()
  loadChordShapes()
  window.addEventListener('resize', onViewportResize)
})

onBeforeUnmount(() => {
  closeToneDotContextMenu()
  stopTextDrag()
  stopAnim()
  window.removeEventListener('resize', onViewportResize)
})

watch(
  () => isPlaying.value,
  (playing) => {
    if (playing) {
      playedNoteKeys.value = new Set()
      // Clear hover/tooltip markings when playback starts.
      hoveredFret.value = null
      hoveredPosKey.value = null
      hoveredToneDotKey.value = null
      hideTooltip()
      startAnim()
      return
    } else {
      playedNoteKeys.value = new Set()
      stopAnim()
      animNowMs.value = performance.now()
    }
  },
  { immediate: true },
)

watch(
  () => Number(directionPreview.value?.startedAtMs) || 0,
  (startedAtMs) => {
    if (!(startedAtMs > 0)) return
    startAnim()
  },
)
</script>

<style scoped>
.fretboard-body {
  --fb-ui-scale: 1;
  --fb-gap-px: 8px;
  --fb-control-h-px: 26px;
  --fb-font-sm-px: 12px;
  --fb-gap: calc(var(--fb-gap-px) * var(--fb-ui-scale));
  --fb-control-h: calc(var(--fb-control-h-px) * var(--fb-ui-scale));
  --fb-font-sm: calc(var(--fb-font-sm-px) * var(--fb-ui-scale));
  --fb-side-pad-left: 40px;
  --fb-side-pad-right: 10px;
  --fb-top-pad: 10px;
  --fb-bottom-pad: 10px;
  --fb-numbers-height-px: 28px;
  --fb-numbers-pad-top-px: 6px;
  --fb-numbers-margin-top: 10px;
  --fb-numbers-margin-bottom: 10px;
  --fb-actions-margin-top: -2px;
  --fb-actions-margin-bottom: 8px;
  --fb-rail-top-pad-px: 30px;
  width: var(--fb-width-clamp, clamp(760px, 92vw, 1460px));
  max-width: 100%;
  margin-inline: auto;
  padding-bottom: var(--fb-bottom-pad);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--panel-side-gap, 6px);
  position: relative;
  overflow: visible;
  min-width: 0;
}

.fb-view-mask rect {
  fill: var(--color-surface);
}

.fb-core-pad {
  width: 100%;
  padding-left: var(--fb-side-pad-left);
  padding-right: var(--fb-side-pad-right);
  padding-top: var(--fb-top-pad);
  padding-bottom: 0;
  margin-bottom: 0;
  box-sizing: border-box;
  overflow: visible;
}

.fb-core-resizable {
  width: 100%;
  padding-bottom: var(--fb-core-resize-pad-bottom, 0px);
  margin-bottom: var(--fb-core-resize-margin-bottom, 0px);
  transform-origin: top center;
  overflow: visible;
}

.fb-stack {
  width: 100%;
  position: relative;
  overflow: visible;
}

.fb-layer {
  position: absolute;
  inset: 0;
}

.fb-overlay {
  z-index: 1;
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
  overflow: visible;
}

.fb-text-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.fb-text-item {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.fb-text-item-drag {
  width: 20px;
  height: 20px;
  border: 1px solid #9aa3ad;
  border-radius: 4px;
  background: #eef1f4;
  color: #3a4350;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  cursor: move;
}

.fb-text-item-input {
  height: 22px;
  min-width: 80px;
  max-width: 180px;
  padding: 0 6px;
  border: 1px solid #9aa3ad;
  border-radius: 4px;
  background: rgb(255 255 255 / 92%);
  color: #1b1f25;
  font-size: 12px;
  font-weight: 600;
}

.fb-text-item-delete {
  width: 20px;
  height: 20px;
  border: 1px solid #b68888;
  border-radius: 4px;
  background: #f6e9e9;
  color: #7b2a2a;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
}

.fb-playback-travel-line line {
  stroke-linecap: round;
  filter: var(--fb-playback-travel-line-shadow);
}

.fb-now-string-line {
  stroke-width: 2.2;
  stroke-linecap: round;
}

.fb-now-cross {
  stroke-width: 4.2;
  stroke-linecap: round;
  filter: var(--fb-now-cross-shadow);
}

.fb-now-ring {
  fill: none;
  stroke-width: 2.8;
  opacity: 0.95;
  filter: var(--fb-now-ring-shadow);
}

.fb-playback-self-loop circle,
.fb-playback-self-loop line {
  stroke-width: 3.1;
  stroke-linecap: round;
  filter: var(--fb-self-loop-shadow);
}

.fb-playback-self-loop .self-loop-base {
  opacity: 0.35;
}

.fb-playback-self-loop .self-loop-progress {
  opacity: 1;
}

.fb-playback-self-loop .self-loop-head {
  filter: var(--fb-self-loop-head-shadow);
}

.fb-harmony-guides circle {
  opacity: 0.95;
}

.fb-tone-dot-symbol {
  fill: var(--fb-tone-dot-symbol-fill);
  stroke: var(--fb-tone-dot-symbol-stroke);
  stroke-width: 1.4;
  paint-order: stroke;
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: middle;
  font-size: 14px;
  font-weight: 800;
  user-select: none;
}

.fb-tone-dot-symbol-icon {
  pointer-events: none;
  user-select: none;
}

.fb-tone-dot-pitch {
  fill: var(--fb-tone-dot-pitch-fill);
  stroke: var(--fb-tone-dot-pitch-stroke);
  stroke-width: 1.1;
  paint-order: stroke;
  pointer-events: none;
  text-anchor: middle;
  dominant-baseline: hanging;
  font-size: 9px;
  font-weight: 700;
  user-select: none;
}

.fb-next-note-preview {
  fill: none;
  stroke: var(--fb-next-note-preview-stroke);
  stroke-width: 2.4;
  stroke-dasharray: 5 3;
  filter: var(--fb-next-note-preview-shadow);
  pointer-events: none;
}

.fb-hand-position-overlay rect {
  fill: var(--fb-hand-overlay-fill);
  stroke: var(--fb-hand-overlay-stroke);
  stroke-width: 2.2;
  filter: var(--fb-hand-overlay-shadow);
}

.fb-hand-position-suggested rect {
  fill: var(--fb-hand-suggested-fill);
  stroke: var(--fb-hand-suggested-stroke);
  stroke-width: 1.8;
  stroke-dasharray: 6 4;
}

.fb-hand-position-suggested text {
  fill: var(--fb-hand-suggested-text-fill);
  stroke: var(--fb-hand-suggested-text-stroke);
  stroke-width: 1;
  paint-order: stroke;
  font-size: 10px;
  font-weight: 700;
}

.fb-tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 5;

  padding: 4px 8px;
  border-radius: 6px;

  background: var(--fb-tooltip-bg);
  color: var(--fb-tooltip-text);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;

  transform: translateY(-2px);
}

.fb-fret-numbers {
  position: relative;
  width: 100%;
  z-index: 6;
  height: var(--fb-numbers-height-px);
  margin-top: var(--fb-numbers-margin-top);
  margin-bottom: var(--fb-numbers-margin-bottom);
  padding-top: var(--fb-numbers-pad-top-px);
  background: transparent;
  border-radius: 10px;
  overflow: visible;
}

.fb-fret-number {
  position: absolute;
  top: 6px;
  transform: translateX(-50%);

  font-size: calc(13px * var(--fb-ui-scale));
  font-weight: 800;
  line-height: 1;

  color: var(--fb-fret-number-color);
  text-shadow: var(--fb-fret-number-shadow);
  user-select: none;
}

.fb-fret-number.is-marker-fret {
  color: var(--fb-fret-number-marker-color);
  text-shadow: var(--fb-fret-number-marker-shadow);
  font-size: calc(14px * var(--fb-ui-scale));
}

.fb-hand-mode-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -2px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--fb-hand-info-text);
}

.fb-hand-mode-info .is-warning {
  color: var(--fb-hand-info-warning-text);
}

.fb-chord-shape-panel {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 10px;
  flex-wrap: wrap;
}

.fb-chord-detected {
  min-width: 86px;
  font-size: 12px;
  font-weight: 800;
  color: var(--fb-chord-detected-text);
  background: var(--fb-chord-detected-bg);
  border: 1px solid var(--fb-chord-detected-border);
  border-radius: 6px;
  padding: 3px 8px;
  text-shadow: var(--fb-chord-detected-shadow);
}

.fb-shape-btn,
.fb-shape-select {
  height: var(--fb-control-h);
  border-radius: 6px;
  border: 1px solid var(--fb-shape-control-border);
  background: var(--fb-shape-control-bg);
  color: var(--fb-shape-control-text);
  font-size: var(--fb-font-sm);
  font-weight: 700;
}

.fb-shape-btn {
  padding: 0 10px;
  cursor: pointer;
}

.fb-shape-btn:disabled,
.fb-shape-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fb-shape-btn.is-danger {
  border-color: var(--fb-shape-danger-border);
  color: var(--fb-shape-danger-text);
}

.fb-shape-btn.is-active {
  border-color: var(--fb-shape-active-border);
  background: var(--fb-shape-active-bg);
  color: var(--fb-shape-active-text);
}

.fb-shape-select {
  min-width: 170px;
  padding: 0 8px;
}
</style>
