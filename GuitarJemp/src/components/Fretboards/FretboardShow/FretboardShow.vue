<template>
  <div ref="rootEl" class="fretboard-js">
    <figure :id="elId" class="fretboard-js-figure" />
    <div v-if="tooltip.visible" class="fb-tooltip" :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }">
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Fretboard } from '@moonwave99/fretboard.js'
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
})

const elId = `fretboardshow_${Math.random().toString(16).slice(2)}`
const rootEl = ref(null)

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()
const playbackVisuals = usePlaybackVisualsStore()

const { playState } = storeToRefs(transport)
const isPlaying = computed(() => playState.value === 'playing')

const { highlightedNoteKeys, pulseStarts } = storeToRefs(playbackVisuals)
const highlightedKeySet = computed(() => new Set(highlightedNoteKeys.value))

const pulseStartedAtByKey = computed(() => {
  const m = new Map()
  for (const p of pulseStarts.value) {
    const key = p?.key
    const startedAtMs = Number(p?.startedAtMs)
    if (key && Number.isFinite(startedAtMs)) m.set(key, startedAtMs)
  }
  return m
})

const animNowMs = ref(0)
let rafId = null

function startAnim() {
  if (rafId != null) return
  const tick = () => {
    animNowMs.value = performance.now()
    applyStyles()
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

const tuningNamesLowToHigh = computed(() => {
  const t = tuning.value
  if (!t?.openMidi?.length) return ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']
  // fretboard.js expects tuning from lower note upward
  return [...t.openMidi]
    .slice()
    .reverse()
    .map((m) => midiToNoteName(m, { includeOctave: true }))
})

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

const fb = ref(null)
let lastConfig = { fretCount: null, stringCount: null, tuningId: null }

function destroyFretboard() {
  try {
    fb.value?.removeEventListeners?.()
  } catch {
    // ignore
  }
  fb.value = null

  const el = document.getElementById(elId)
  if (el) el.innerHTML = ''
}

function createFretboard() {
  destroyFretboard()

  lastConfig = {
    fretCount: Number(props.numFrets) || 12,
    stringCount: Number(instrument.numStrings) || 6,
    tuningId: instrument.tuningId,
  }

  fb.value = new Fretboard({
    el: `#${elId}`,
    stringCount: lastConfig.stringCount,
    fretCount: lastConfig.fretCount,
    tuning: tuningNamesLowToHigh.value,
    width: 1100,
    height: 180,
    fretColor: '#000',
    fretWidth: 1,
    nutColor: '#000',
    nutWidth: 7,
    stringColor: '#222',
    showFretNumbers: true,
    dotText: () => '',
  })

  fb.value.on('click', (pos) => {
    const string = Number(pos?.string)
    const fret = Number(pos?.fret)
    if (!Number.isFinite(string) || !Number.isFinite(fret)) return

    // Show-mode: only allow selecting/previewing existing notes.
    const d = noteDotByPosKey.value.get(`${string}-${fret}`)
    if (!d?._noteKey) return

    selection.selectNote(d._noteKey)
    if (!settings.soundPreviewEnabled) return
    const t = tuning.value
    const midi = midiForFretString({ fret, string }, t)
    if (Number.isFinite(Number(midi))) void playMidi(midi)
  })

  fb.value.on('mousemove', (pos, event) => {
    const fret = Number(pos?.fret)
    if (!Number.isFinite(fret)) return
    const string = Number(pos?.string)
    const nextKey = `${string}-${fret}`
    const samePos = hoveredPosKey.value === nextKey

    hoveredFret.value = fret
    hoveredPosKey.value = nextKey

    // Tooltip only for positions that are actually selected notes.
    const d = noteDotByPosKey.value.get(nextKey)
    if (!d) {
      hideTooltip()
      applyStyles()
      return
    }

    const t = tuning.value
    const midi = midiForFretString({ fret, string }, t)
    const text = Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
    if (!text) {
      hideTooltip()
      applyStyles()
      return
    }

    const nextText = !samePos || tooltip.value.text !== text ? text : tooltip.value.text
    setTooltipFromEvent(event, nextText)
    applyStyles()
  })

  fb.value.on('mouseleave', () => {
    if (hoveredFret.value === null) return
    hoveredFret.value = null
    hoveredPosKey.value = null
    hideTooltip()
    applyStyles()
  })

  renderDots()
}

function renderDots() {
  if (!fb.value) return

  // Show-mode: render only the previously selected notes.
  const noteDots = dotsForRender.value
  fb.value.setDots(noteDots).render()
  applyStyles()
}

function applyStyles() {
  if (!fb.value) return

  const BASE_OPACITY = FRETBOARD_SHOW_DOT_BASE_OPACITY_WHILE_PLAYING
  const PULSE_MS = FRETBOARD_SHOW_DOT_PULSE_MS
  const baseR = (Number(fb.value?.options?.dotSize) || 20) * 0.5

  try {
    fb.value.style({
      filter: () => true,
      fill: (pos) => pos?.color ?? 'white',
      stroke: (pos) => {
        const key = `${Number(pos?.string)}-${Number(pos?.fret)}`
        return hoveredPosKey.value === key ? 'rgba(20, 20, 20, 0.95)' : 'rgba(20, 20, 20, 0.7)'
      },
      'stroke-width': (pos) => {
        const key = `${Number(pos?.string)}-${Number(pos?.fret)}`
        const w = hoveredPosKey.value === key ? 4 : 2
        const noteKey = pos?._noteKey
        if (!noteKey) return w

        const startedAt = pulseStartedAtByKey.value.get(noteKey)
        if (!Number.isFinite(startedAt)) return w

        const dt = animNowMs.value - startedAt
        if (!(dt >= 0 && dt <= PULSE_MS)) return w
        const p = dt / PULSE_MS
        const bump = Math.sin(Math.PI * p) // 0 -> 1 -> 0
        return w + FRETBOARD_SHOW_DOT_PULSE_STROKE_ADD * bump
      },
      opacity: (pos) => {
        if (!isPlaying.value) return 1
        const key = pos?._noteKey
        return key && highlightedKeySet.value.has(key) ? 1 : BASE_OPACITY
      },
      r: (pos) => {
        const noteKey = pos?._noteKey
        if (!noteKey) return baseR

        const startedAt = pulseStartedAtByKey.value.get(noteKey)
        if (!Number.isFinite(startedAt)) return baseR

        const dt = animNowMs.value - startedAt
        if (!(dt >= 0 && dt <= PULSE_MS)) return baseR
        const p = dt / PULSE_MS
        const bump = Math.sin(Math.PI * p)
        return baseR * (1 + FRETBOARD_SHOW_DOT_PULSE_RADIUS_FACTOR * bump)
      },
      text: () => '',
    })
  } catch {
    // ignore styling errors (library version differences)
  }

  const s = selectedPos.value
  if (!s) return
  try {
    fb.value.style({
      filter: { string: s.string, fret: s.fret },
      stroke: 'rgba(20, 20, 20, 0.95)',
      'stroke-width': 4,
    })
  } catch {
    // ignore
  }
}

onMounted(() => {
  createFretboard()
  animNowMs.value = performance.now()
})

onBeforeUnmount(() => {
  stopAnim()
  destroyFretboard()
})

watch(
  () => isPlaying.value,
  (playing) => {
    if (playing) startAnim()
    else {
      stopAnim()
      animNowMs.value = performance.now()
      applyStyles()
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
    const nextFretCount = Number(props.numFrets) || 12
    const nextStringCount = Number(instrument.numStrings) || 6
    const nextTuningId = instrument.tuningId

    const needsRecreate =
      !fb.value ||
      lastConfig.fretCount !== nextFretCount ||
      lastConfig.stringCount !== nextStringCount ||
      lastConfig.tuningId !== nextTuningId

    if (needsRecreate) createFretboard()
    else renderDots()
  },
  { deep: true },
)
</script>

<style scoped>
.fretboard-js {
  width: 100%;
  position: relative;
}

.fretboard-js-figure {
  margin: 0;
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
</style>
