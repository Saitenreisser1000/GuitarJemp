<template>
  <div class="fretboard-container">
    <FretboardControls @update-frets="(n) => (numFrets = n)" />

    <div class="fretboard">
      <div class="strings-container">
        <StringTrack
          v-for="string in numStrings"
          :key="string"
          :string-number="string"
          :num-frets="numFrets"
          :active-notes="activeNotes"
          @toggle-note="toggleNote"
        />
      </div>

      <div class="fret-numbers">
        <div class="empty-corner"></div>
        <div v-for="fret in numFrets" :key="fret" class="fret-number">{{ fret }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Multi-word component name to satisfy ESLint/Vue style guide
defineOptions({ name: 'GuitarFretboard' })
import { ref, computed } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import FretboardControls from './controls/FretboardControls.vue'
import StringTrack from './ui/StringTrack.vue'

const store = useNotesStore()

const numStrings = computed(() => store.numStrings)
const numFrets = ref(12)
const activeNotes = computed(() => store.activeNotes)

function toggleNote(key) {
  store.toggleNote(key)
}
</script>

<style scoped>
.fretboard-container { padding:20px }
.fretboard { margin-top:10px }

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
