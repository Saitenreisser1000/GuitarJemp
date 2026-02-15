import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const NOTE_TO_PC = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
}

const CHORD_INTERVALS = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  'dominant 7': [0, 4, 7, 10],
  'major 7': [0, 4, 7, 11],
  'minor 7': [0, 3, 7, 10],
  'half-diminished 7': [0, 3, 6, 10],
  'diminished 7': [0, 3, 6, 9],
  add9: [0, 4, 7, 14],
  'major 6': [0, 4, 7, 9],
  'minor 6': [0, 3, 7, 9],
}

const SCALE_INTERVALS = {
  'major (ionian)': [0, 2, 4, 5, 7, 9, 11],
  'natural minor (aeolian)': [0, 2, 3, 5, 7, 8, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  'major pentatonic': [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'whole tone': [0, 2, 4, 6, 8, 10],
  'diminished (whole-half)': [0, 2, 3, 5, 6, 8, 9, 11],
}

function toPitchClassSet(rootName, intervals) {
  const root = NOTE_TO_PC[String(rootName ?? '')]
  if (!Number.isFinite(root) || !Array.isArray(intervals) || !intervals.length) return new Set()
  return new Set(intervals.map((i) => ((root + Number(i)) % 12 + 12) % 12))
}

function startFretFromPosition(label) {
  const text = String(label ?? '').trim()
  if (!text) return 0
  if (text.toLowerCase() === 'open') return 0
  const n = Number.parseInt(text, 10)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function patternOffsets(patternLabel) {
  const p = String(patternLabel ?? '')
  if (p.startsWith('CAGED ')) {
    const n = Number.parseInt(p.slice(6), 10)
    const index = Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : 1
    const start = (index - 1) * 2
    return { fromOffset: start, toOffset: start + 4 }
  }
  if (p === '3 Notes Per String') return { fromOffset: 0, toOffset: 5 }
  if (p === 'Box Pattern 1') return { fromOffset: 0, toOffset: 3 }
  if (p === 'Box Pattern 2') return { fromOffset: 3, toOffset: 6 }
  if (p === 'Box Pattern 3') return { fromOffset: 6, toOffset: 9 }
  return { fromOffset: 0, toOffset: 4 }
}

export const useHarmonyMenuStore = defineStore('harmonyMenu', () => {
  const chordRoot = ref('C')
  const chordType = ref('major')
  const showChord = ref(false)

  const scaleRoot = ref('C')
  const scaleType = ref('major (ionian)')
  const showScale = ref(false)

  const position = ref('Open')
  const pattern = ref('CAGED 1')

  const chordPitchClasses = computed(() => {
    const intervals = CHORD_INTERVALS[String(chordType.value ?? '')] ?? null
    return toPitchClassSet(chordRoot.value, intervals)
  })

  const scalePitchClasses = computed(() => {
    const intervals = SCALE_INTERVALS[String(scaleType.value ?? '')] ?? null
    return toPitchClassSet(scaleRoot.value, intervals)
  })

  const patternFretRange = computed(() => {
    const startFret = startFretFromPosition(position.value)
    const { fromOffset, toOffset } = patternOffsets(pattern.value)
    return {
      fromFret: Math.max(0, startFret + fromOffset),
      toFret: Math.max(0, startFret + toOffset),
    }
  })

  return {
    chordRoot,
    chordType,
    showChord,
    scaleRoot,
    scaleType,
    showScale,
    position,
    pattern,
    chordPitchClasses,
    scalePitchClasses,
    patternFretRange,
  }
})
