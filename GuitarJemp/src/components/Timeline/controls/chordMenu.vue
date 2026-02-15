<template>
  <v-card class="chord-menu-card ui-panel" variant="flat">
    <div class="chord-menu-title">Chord Menu</div>
    <div class="chord-menu-topbar">
      <div class="chord-menu-controls">
        <v-select
          v-model="selectedChord"
          :items="chordOptions"
          item-title="title"
          item-value="value"
          label="Root"
          density="compact"
          hide-details
          variant="outlined"
          class="chord-select"
        />
        <v-select
          v-model="selectedChordType"
          :items="chordTypeOptions"
          label="Chord"
          density="compact"
          hide-details
          variant="outlined"
          class="chord-type-select"
        />
        <v-select
          v-model="selectedPosition"
          :items="positionOptions"
          label="Position"
          density="compact"
          hide-details
          variant="outlined"
          class="position-select"
        />
      </div>
    </div>
    <div class="scale-menu-title">Scale Menu</div>
    <div class="scale-menu-bar">
      <div class="scale-menu-controls">
        <v-select
          v-model="selectedScaleRoot"
          :items="chordOptions"
          item-title="title"
          item-value="value"
          label="Root"
          density="compact"
          hide-details
          variant="outlined"
          class="scale-root-select"
        />
        <v-select
          v-model="selectedScaleType"
          :items="scaleOptions"
          label="Scales"
          density="compact"
          hide-details
          variant="outlined"
          class="scale-type-select"
        />
        <v-select
          v-model="selectedPattern"
          :items="patternOptions"
          label="Pattern"
          density="compact"
          hide-details
          variant="outlined"
          class="scale-pattern-select"
        />
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useHarmonyMenuStore } from '@/store/useHarmonyMenu'

const harmony = useHarmonyMenuStore()
const {
  chordRoot: selectedChord,
  chordType: selectedChordType,
  scaleRoot: selectedScaleRoot,
  scaleType: selectedScaleType,
  position: selectedPosition,
  pattern: selectedPattern,
} = storeToRefs(harmony)

const chordOptions = [
  { title: 'C', value: 'C' },
  { title: 'C# / Db', value: 'C#' },
  { title: 'D', value: 'D' },
  { title: 'D# / Eb', value: 'D#' },
  { title: 'E', value: 'E' },
  { title: 'F', value: 'F' },
  { title: 'F# / Gb', value: 'F#' },
  { title: 'G', value: 'G' },
  { title: 'G# / Ab', value: 'G#' },
  { title: 'A', value: 'A' },
  { title: 'A# / Bb', value: 'A#' },
  { title: 'B', value: 'B' },
]
const chordTypeOptions = [
  'major',
  'minor',
  'diminished',
  'augmented',
  'sus2',
  'sus4',
  'dominant 7',
  'major 7',
  'minor 7',
  'half-diminished 7',
  'diminished 7',
  'add9',
  'major 6',
  'minor 6',
]
const scaleOptions = [
  'major (ionian)',
  'natural minor (aeolian)',
  'harmonic minor',
  'melodic minor',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'locrian',
  'major pentatonic',
  'minor pentatonic',
  'blues',
  'chromatic',
  'whole tone',
  'diminished (whole-half)',
]
const positionOptions = [
  'Open',
  '1st Position',
  '2nd Position',
  '3rd Position',
  '4th Position',
  '5th Position',
  '7th Position',
  '9th Position',
  '12th Position',
]
const patternOptions = [
  'CAGED 1',
  'CAGED 2',
  'CAGED 3',
  'CAGED 4',
  'CAGED 5',
  '3 Notes Per String',
  'Box Pattern 1',
  'Box Pattern 2',
  'Box Pattern 3',
]
</script>

<style scoped>
.chord-menu-card {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
}

.chord-menu-topbar {
  padding: 8px 10px 10px;
  border-top: 1px solid var(--color-border);
}

.chord-menu-controls {
  display: flex;
  gap: 8px;
}

.chord-select {
  max-width: 180px;
}

.chord-type-select {
  max-width: 200px;
}

.position-select {
  max-width: 180px;
}

.chord-menu-title {
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.scale-menu-title {
  padding: 8px 12px 10px;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--color-text-muted);
}

.scale-menu-bar {
  padding: 0 10px 10px;
}

.scale-menu-controls {
  display: flex;
  gap: 8px;
}

.scale-root-select {
  max-width: 180px;
}

.scale-type-select {
  max-width: 220px;
}

.scale-pattern-select {
  max-width: 190px;
}
</style>
