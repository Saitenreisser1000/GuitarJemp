<template>
  <div ref="rootEl" class="fretboard-js">
    <div class="fb-stack" :style="{ aspectRatio: `${FB_WIDTH} / ${FB_HEIGHT}` }">
      <RealisticFretboardBackground
        class="fb-layer fb-bg"
        :width="FB_WIDTH"
        :height="FB_HEIGHT"
        :nut-width="NUT_WIDTH"
        :fret-count="props.numFrets"
        :string-count="instrument.numStrings"
      />

      <svg
        ref="overlayEl"
        class="fb-layer fb-overlay"
        :viewBox="`0 0 ${FB_WIDTH} ${FB_HEIGHT}`"
        preserveAspectRatio="none"
        style="overflow: visible"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        @click="onClick"
      >
        <!-- transparent hit-area -->
        <rect :x="0" :y="0" :width="FB_WIDTH" :height="FB_HEIGHT" fill="transparent" />

        <!-- String numbers -->
        <g class="fb-string-labels">
          <text
            v-for="s in strings"
            :key="`string-label-${s.string}`"
            :x="-10"
            :y="s.y + 4"
            text-anchor="end"
            font-size="12"
            font-weight="800"
            fill="rgba(255,255,255,0.9)"
            stroke="rgba(0,0,0,0.45)"
            stroke-width="2"
            paint-order="stroke"
          >
            {{ stringLabelFor(s.string) }}
          </text>
        </g>

        <!-- Dots -->
        <g class="fb-dots">
          <!-- Hover preview for inactive positions (editor only) -->
          <circle
            v-if="hoveredPreviewDot"
            :cx="dotX(hoveredPreviewDot)"
            :cy="dotY(hoveredPreviewDot)"
            :r="previewR()"
            fill="transparent"
            stroke="rgba(255,255,255,0.85)"
            stroke-width="3"
            style="pointer-events: none"
          />

          <circle
            v-for="d in dotsForRender"
            :key="`dot-${d._noteKey ?? `${d.string}-${d.fret}`}`"
            :cx="dotX(d)"
            :cy="dotY(d)"
            :r="dotR(d)"
            :fill="dotFill(d)"
            :opacity="dotOpacity(d)"
            :stroke="dotStroke(d)"
            :stroke-width="dotStrokeWidth(d)"
            @mouseenter="onDotEnter(d, $event)"
            @mouseleave="onDotLeave(d)"
          />
        </g>
      </svg>
    </div>

    <div class="fb-fret-numbers" aria-hidden="true">
      <span
        v-for="l in fretLabels"
        :key="`fret-label-${l.fret}`"
        class="fb-fret-number"
        :style="{ left: `${l.xPct}%` }"
      >
        {{ l.fret }}
      </span>
    </div>

    <div
      v-if="tooltip.visible"
      class="fb-tooltip"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RealisticFretboardBackground from './RealisticFretboardBackground.vue'
import { storeToRefs } from 'pinia'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { usePlaybackVisualsStore } from '@/store/usePlaybackVisuals'
import {
  FRETBOARD_SHOW_DOT_BASE_OPACITY_WHILE_PLAYING,
  FRETBOARD_SHOW_DOT_PULSE_MS,
  FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR,
  FRETBOARD_SHOW_DOT_PULSE_STROKE_ADD,
} from '@/config/fretboardShow'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForFretString } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'

defineOptions({ name: 'FretboardShow' })

const props = defineProps({
  numFrets: { type: Number, required: true },
  editable: { type: Boolean, default: false },
})

const FB_WIDTH = 1100
const FB_HEIGHT = 180
const NUT_WIDTH = 12
const rootEl = ref(null)
const overlayEl = ref(null)

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()
const playbackVisuals = usePlaybackVisualsStore()

const { playState } = storeToRefs(transport)
const isPlaying = computed(() => playState.value === 'playing')

const { highlightedNoteKeys, pulseStarts } = storeToRefs(playbackVisuals)

function posKeyForNote(note) {
  const string = Number(note?.string)
  const fret = Number(note?.fret)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  return `${string}-${fret}`
}

const highlightedPosKeySet = computed(() => {
  const keys = Array.isArray(highlightedNoteKeys.value) ? highlightedNoteKeys.value : []
  if (keys.length === 0) return new Set()

  const set = new Set()
  for (const noteKey of keys) {
    const note = store.activeNotes.find((n) => n?.key === noteKey)
    const posKey = posKeyForNote(note)
    if (posKey) set.add(posKey)
  }
  return set
})

const pulseStartedAtByPosKey = computed(() => {
  const m = new Map()
  for (const p of pulseStarts.value) {
    const noteKey = p?.key
    const startedAtMs = Number(p?.startedAtMs)
    if (!noteKey || !Number.isFinite(startedAtMs)) continue

    const note = store.activeNotes.find((n) => n?.key === noteKey)
    const posKey = posKeyForNote(note)
    if (!posKey) continue

    const prev = m.get(posKey)
    if (prev == null || startedAtMs > prev) m.set(posKey, startedAtMs)
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

const dotsForRender = computed(() => {
  // fretboard.js is dot-based; we de-duplicate multiple note-events at the same string/fret.
  // Keep the most recently placed note for each position.
  const byPos = new Map()
  for (const note of store.activeNotes) {
    const string = Number(note?.string)
    const fret = Number(note?.fret)
    if (!Number.isFinite(string) || !Number.isFinite(fret)) continue
    const key = `${string}-${fret}`
    const prev = byPos.get(key)
    if (!prev || (Number(note?.placedAtMs) || 0) >= (Number(prev?.placedAtMs) || 0))
      byPos.set(key, note)
  }

  return [...byPos.values()].map((note) => ({
    string: Number(note.string),
    fret: Number(note.fret),
    color: note.color,
    _noteKey: note.key,
    _kind: 'note',
  }))
})

const noteDotByPosKey = computed(() => {
  const m = new Map()
  for (const d of dotsForRender.value) m.set(`${Number(d.string)}-${Number(d.fret)}`, d)
  return m
})

const hoveredFret = ref(null)
const hoveredPosKey = ref(null)
const hoveredDotKey = ref(null)

const hoveredPreviewDot = computed(() => {
  if (!props.editable) return null
  const key = hoveredPosKey.value
  if (!key) return null
  if (noteDotByPosKey.value.get(key)) return null
  const [stringRaw, fretRaw] = String(key).split('-')
  const string = Number(stringRaw)
  const fret = Number(fretRaw)
  if (!Number.isFinite(string) || !Number.isFinite(fret)) return null
  return { string, fret }
})

const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })

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

const selectedPos = computed(() => {
  const key = selection.selectedNoteKey
  if (!key) return null
  const note = store.activeNotes.find((n) => n?.key === key)
  if (!note) return null
  return { string: Number(note.string), fret: Number(note.fret) }
})

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

const fretLabels = computed(() => {
  const max = Math.max(0, Number(props.numFrets) || 0)
  const lines = fretLinesPx.value
  const out = []

  // Labels should be centered under the fret fields (1..n).
  // Fret 1 is between nut and the first fret line.
  for (let fret = 1; fret <= max; fret++) {
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
  const y = ((clientY - rect.top) / rect.height) * FB_HEIGHT
  return { x, y }
}

function hoveredPosFromEvent(event) {
  const p = clientToSvgPoint(event)
  if (!p) return null
  const fret = xToFret(p.x)
  const string = yToString(p.y)
  return { fret, string }
}

function onClick(event) {
  const pos = hoveredPosFromEvent(event)
  if (!pos) return
  const { fret, string } = pos

  if (props.editable) {
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
  const d = noteDotByPosKey.value.get(`${string}-${fret}`)
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
  if (hoveredDotKey.value) {
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
    const d = noteDotByPosKey.value.get(nextKey)
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
  hoveredDotKey.value = null
  hideTooltip()
}

const DOT_BASE_R = 14.4
const DOT_HOVER_R_FACTOR = 1.12

function posKeyForDot(d) {
  return `${Number(d?.string)}-${Number(d?.fret)}`
}

function isDotHovered(d) {
  const key = posKeyForDot(d)
  return hoveredDotKey.value === key || hoveredPosKey.value === key
}

function onDotEnter(d, event) {
  const key = posKeyForDot(d)
  hoveredDotKey.value = key
  hoveredPosKey.value = key
  hoveredFret.value = Number(d?.fret)

  const t = tuning.value
  const fret = Number(d?.fret)
  const string = Number(d?.string)
  const midi = midiForFretString({ fret, string }, t)
  const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
  if (text) setTooltipFromEvent(event, text)
}

function onDotLeave(d) {
  const key = posKeyForDot(d)
  if (hoveredDotKey.value === key) hoveredDotKey.value = null
  // leave hoveredPosKey to mousemove (field hover) or mouseleave
  hideTooltip()
}

function dotX(d) {
  const fret = Math.max(0, Number(d?.fret) || 0)
  const lines = fretLinesPx.value
  const max = Math.min(fret, Number(props.numFrets) || 12)

  // Open-string dot: on the nut.
  if (max === 0) return NUT_WIDTH / 2

  // Fret n dot belongs to the field between (n-1) and n.
  const left = max === 1 ? NUT_WIDTH : Number(lines[max - 1] ?? 0)
  const right = Number(lines[max] ?? FB_WIDTH)
  return (left + right) / 2
}

function dotY(d) {
  const string = Number(d?.string)
  const s = strings.value.find((x) => Number(x.string) === string)
  return Number(s?.y) || 0
}

function dotFill(d) {
  return d?.color ?? 'white'
}

function dotOpacity(d) {
  if (!isPlaying.value) return 1
  const posKey = posKeyForDot(d)
  return highlightedPosKeySet.value.has(posKey) ? 1 : FRETBOARD_SHOW_DOT_BASE_OPACITY_WHILE_PLAYING
}

function dotStroke(d) {
  const key = posKeyForDot(d)
  const hoverStroke =
    hoveredPosKey.value === key ? 'rgba(20, 20, 20, 0.95)' : 'rgba(20, 20, 20, 0.7)'

  const s = selectedPos.value
  if (s && Number(s.string) === Number(d?.string) && Number(s.fret) === Number(d?.fret)) {
    return 'rgba(20, 20, 20, 0.95)'
  }

  return hoverStroke
}

function dotStrokeWidth(d) {
  const key = posKeyForDot(d)
  let w = hoveredPosKey.value === key ? 4 : 2

  if (isDotHovered(d)) w = Math.max(w, 4)

  const s = selectedPos.value
  if (s && Number(s.string) === Number(d?.string) && Number(s.fret) === Number(d?.fret)) {
    w = 4
  }

  const startedAt = pulseStartedAtByPosKey.value.get(key)
  if (!Number.isFinite(startedAt)) return w

  const dt = animNowMs.value - startedAt
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  if (!(dt >= 0 && dt <= PULSE_MS)) return w
  const p = dt / PULSE_MS
  const bump = Math.sin(Math.PI * p)
  return w + FRETBOARD_SHOW_DOT_PULSE_STROKE_ADD * bump
}

function dotR(d) {
  const key = posKeyForDot(d)
  const baseR = DOT_BASE_R * (hoveredPosKey.value === key ? DOT_HOVER_R_FACTOR : 1)
  const startedAt = pulseStartedAtByPosKey.value.get(key)
  if (!Number.isFinite(startedAt)) return baseR

  const dt = animNowMs.value - startedAt
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  if (!(dt >= 0 && dt <= PULSE_MS)) return baseR
  const p = dt / PULSE_MS
  const bump = Math.sin(Math.PI * p)
  return baseR * (1 + FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR * bump)
}

function previewR() {
  // Keep preview a touch smaller than a fully hovered active dot.
  return DOT_BASE_R * 1.02
}

onMounted(() => {
  animNowMs.value = performance.now()
})

onBeforeUnmount(() => {
  stopAnim()
})

watch(
  () => isPlaying.value,
  (playing) => {
    if (playing) startAnim()
    else {
      stopAnim()
      animNowMs.value = performance.now()
    }
  },
  { immediate: true },
)

watch(
  [
    () => props.numFrets,
    () => instrument.numStrings,
    () => instrument.tuningId,
    () => dotsForRender.value,
    () => selection.selectedNoteKey,
    () => playState.value,
    () => highlightedNoteKeys.value,
  ],
  () => {
    // No-op: keeping this watcher keeps reactive deps warm (tuning/notes/selection)
    // and mirrors the previous behavior where the canvas re-rendered on these changes.
  },
  { deep: true },
)
</script>

<style scoped>
.fretboard-js {
  width: 100%;
  position: relative;
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

.fb-bg {
  z-index: 1;
  pointer-events: none;
}

.fb-overlay {
  z-index: 2;
  width: 100%;
  height: 100%;
  display: block;
  cursor: pointer;
  overflow: visible;
}

.fb-tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 5;

  padding: 4px 8px;
  border-radius: 6px;

  background: rgba(20, 20, 20, 0.9);
  color: white;
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
  height: 28px;
  margin-top: 10px;
  margin-bottom: 10px;
  padding-top: 6px;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  overflow: visible;
}

.fb-fret-number {
  position: absolute;
  top: 6px;
  transform: translateX(-50%);

  font-size: 13px;
  font-weight: 800;
  line-height: 1;

  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
  user-select: none;
}
</style>
