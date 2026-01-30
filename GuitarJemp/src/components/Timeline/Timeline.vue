<template>
  <div class="timeline-main">
    <PlaybackControls
      :is-playing="isPlaying"
      :tempo="tempo"
      @toggle-play="togglePlay"
      @update-tempo="(v) => (tempo = v)"
    />

    <ModeSelector
      :selected-mode="selectedMode"
      :snap-enabled="snapEnabled"
      :beat-top="beatTop"
      :beat-bottom="beatBottom"
      @update-mode="(m) => (selectedMode = m)"
      @update-snap="(s) => (snapEnabled = s)"
      @update-beat-top="(v) => (beatTop = v)"
      @update-beat-bottom="(v) => (beatBottom = v)"
    />

    <div class="timeline">
      <TimelineGrid :total-blocks="totalBlocks" :beat-top="beatTop" />
      <PlayheadIndicator :playhead="playhead" :total-duration="totalDuration" />

      <div class="strings-timeline">
        <TimelineTrack
          v-for="stringIdx in numStrings"
          :key="stringIdx"
          :string="stringIdx"
          :notes="notesForString(stringIdx)"
          :total-duration="totalDuration"
          :total-blocks="totalBlocks"
          :playhead="playhead"
          :snap-enabled="snapEnabled"
          :step="currentStep"
          :beat-top="beatTop"
          @update-note-grid-index="handleUpdateNoteGridIndex"
          @update-note-length="handleUpdateNoteLength"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import PlaybackControls from './controls/PlaybackControls.vue'
import ModeSelector from './controls/ModeSelector.vue'
import TimelineGrid from './ui/TimelineGrid.vue'
import PlayheadIndicator from './ui/PlayheadIndicator.vue'
import TimelineTrack from './TimelineTrack.vue'
import { useNotesStore } from '@/store/useNotes'
import { usePlayback } from '@/composables/usePlayback'
import { useGrid } from '@/composables/useGrid'

const store = useNotesStore()
const selectedMode = computed({
  get: () => store.selectedMode,
  set: (v) => store.setSelectedMode(v)
})
const tempo = computed({ get: () => store.tempo, set: v => store.setTempo(v) })
const snapEnabled = ref(true)
const beatTop = ref(4)
const beatBottom = ref(4)

const grid = useGrid()

const stepMap = { '1/16': 0.25, '1/8': 0.5, '1/4': 1, '1/2': 2, '1': 4 }
const currentStep = computed(() => stepMap[selectedMode.value] ?? 1)

const notesForRender = computed(() => {
  return store.activeNotes.map((note, idx) => {
    const key = note?.key
    const fret = note?.fret
    const string = note?.string
    // 1-based raster index stored per note (fallback to insertion order)
    const gridIndex = Number.isFinite(note?.gridIndex) ? note.gridIndex : (idx + 1)
    const timeMs = Number.isFinite(note?.timeMs) ? note.timeMs : 0
    const lengthBlocks = Number.isFinite(note?.lengthBlocks) ? note.lengthBlocks : 1
    return { key, fret, string, gridIndex, timeMs, lengthBlocks }
  })
})

const numStrings = computed(() => store.numStrings)

function notesForString(s) {
  return notesForRender.value.filter(n => n.string === s)
}

function handleUpdateNoteGridIndex(noteKey, gridIndex) {
  store.setNoteGridIndex(noteKey, gridIndex)
}

function handleUpdateNoteLength(noteKey, lengthBlocks) {
  store.setNoteLength(noteKey, lengthBlocks)
}

function togglePlay() {
  if (playback.isPlaying.value) playback.stop()
  else playback.start(totalDuration.value, store.tempo)
}

const totalDuration = computed(() => {
  // Timeline duration is derived from number of raster blocks (not from note "time")
  return totalBlocks.value * grid.grid.value.timePerBlock
})

const totalBlocks = computed(() => {
  const maxIndex = Math.max(0, ...notesForRender.value.map(n => n.gridIndex || 0))
  // keep some space to the right
  return Math.max(16, maxIndex + 8)
})

const playhead = ref(0)
const playback = usePlayback({ onTick: (t) => (playhead.value = t) })
const isPlaying = computed(() => playback.isPlaying.value)
</script>

<style scoped>
.timeline-main {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.timeline {
  position: relative;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow: hidden;
}

.strings-timeline {
  position: relative;
}
</style>
