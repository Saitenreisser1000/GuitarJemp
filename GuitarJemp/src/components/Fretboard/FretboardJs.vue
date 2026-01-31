<template>
  <div class="fretboard-js">
    <figure :id="elId" class="fretboard-js-figure" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Fretboard } from '@moonwave99/fretboard.js'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForFretString } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'

defineOptions({ name: 'FretboardJs' })

const props = defineProps({
  numFrets: { type: Number, required: true }
})

const elId = `fretboardjs_${Math.random().toString(16).slice(2)}`

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()

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
    if (!prev || (Number(note?.placedAtMs) || 0) >= (Number(prev?.placedAtMs) || 0)) byPos.set(key, note)
  }

  return [...byPos.values()].map((note) => ({
    string: Number(note.string),
    fret: Number(note.fret),
    color: note.color,
    _noteKey: note.key
  }))
})

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
    tuningId: instrument.tuningId
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
    dotText: (pos) => {
      const t = tuning.value
      const midi = midiForFretString({ fret: pos?.fret, string: pos?.string }, t)
      return Number.isFinite(Number(midi)) ? midiToNoteName(midi, { includeOctave: true }) : ''
    }
  })

  fb.value.on('click', (pos) => {
    const string = Number(pos?.string)
    const fret = Number(pos?.fret)
    if (!Number.isFinite(string) || !Number.isFinite(fret)) return

    store.addNote(`${fret}-${string}`)

    if (!settings.soundPreviewEnabled) return
    const t = tuning.value
    const midi = midiForFretString({ fret, string }, t)
    if (Number.isFinite(Number(midi))) void playMidi(midi)
  })

  renderDots()
}

function renderDots() {
  if (!fb.value) return

  fb.value.setDots(dotsForRender.value).render()

  // Apply per-dot color.
  try {
    fb.value.style({
      filter: () => true,
      fill: (pos) => pos?.color ?? 'white',
      stroke: 'rgba(20, 20, 20, 0.7)',
      strokeWidth: 2
    })
  } catch {
    // ignore styling errors (library version differences)
  }

  // Selection highlight (by position).
  const s = selectedPos.value
  if (!s) return
  try {
    fb.value.style({
      filter: { string: s.string, fret: s.fret },
      stroke: 'rgba(20, 20, 20, 0.95)',
      strokeWidth: 4
    })
  } catch {
    // ignore
  }
}

onMounted(() => {
  createFretboard()
})

onBeforeUnmount(() => {
  destroyFretboard()
})

watch(
  [
    () => props.numFrets,
    () => instrument.numStrings,
    () => instrument.tuningId,
    () => dotsForRender.value,
    () => selection.selectedNoteKey
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
  { deep: true }
)
</script>

<style scoped>
.fretboard-js {
  width: 100%;
}

.fretboard-js-figure {
  margin: 0;
}
</style>
