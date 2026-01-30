<template>
  <div class="fretboard-container">
    <FretboardControls @update-frets="(n) => (numFrets = n)" />

    <div class="fretboard-row">
      <div class="fretboard">
        <div class="strings-container">
          <StringTrack
            v-for="string in numStrings"
            :key="string"
            :string-number="string"
            :num-frets="numFrets"
            :active-notes="activeNotes"
            :selected-fret="selectedFretString?.fret ?? null"
            :selected-string="selectedFretString?.string ?? null"
            @toggle-note="toggleNote"
          />
        </div>

        <div class="fret-numbers">
          <div class="empty-corner"></div>
          <div v-for="fret in numFrets" :key="fret" class="fret-number">{{ fret }}</div>
        </div>
      </div>

      <div class="palette-wrapper">
        <ColorPalette />
      </div>
    </div>
  </div>
</template>

<script setup>
// Multi-word component name to satisfy ESLint/Vue style guide
defineOptions({ name: 'GuitarFretboard' })
import { ref, computed } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useSelectionStore } from '@/store/useSelection'
import FretboardControls from './controls/FretboardControls.vue'
import ColorPalette from './controls/ColorPalette.vue'
import StringTrack from './ui/StringTrack.vue'

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()

const numStrings = computed(() => instrument.numStrings)
const numFrets = ref(12)
const activeNotes = computed(() => store.activeNotes)

const selectedFretString = computed(() => {
  const key = selection.selectedNoteKey
  if (!key) return null
  const note = store.activeNotes.find((n) => n?.key === key)
  if (!note) return null
  return { fret: note.fret, string: note.string }
})

function toggleNote(key) {
  store.addNote(key)
}
</script>

<style scoped>
.fretboard-container { padding:20px }
.fretboard-row {
  margin-top: 10px;
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.fretboard {
  flex: 1;
}

.palette-wrapper {
  width: 70px;
  display: flex;
}

/* horizontal fret numbers aligned with frets */
.fret-numbers {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
}
.empty-corner { width: 40px; }
.fret-number {
  width: 80px; /* same width as .fret-position */
  text-align: center;
  padding: 6px 0;
  color: #666;
  font-weight: bold;
}
</style>
