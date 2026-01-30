<template>
  <div class="timeline-main">
    <PlaybackControls
      :is-playing="isPlaying"
      :tempo="tempo"
      @toggle-play="togglePlay"
      @update-tempo="transport.setTempo"
    />

    <ModeSelector
      :selected-mode="selectedMode"
      :snap-enabled="snapEnabled"
      :beat-top="beatTop"
      :beat-bottom="beatBottom"
      @update-mode="settings.setSelectedMode"
      @update-snap="settings.setSnapEnabled"
      @update-beat-top="settings.setBeatTop"
      @update-beat-bottom="settings.setBeatBottom"
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
import { storeToRefs } from 'pinia'
import PlaybackControls from './controls/PlaybackControls.vue'
import ModeSelector from './controls/ModeSelector.vue'
import TimelineGrid from './ui/TimelineGrid.vue'
import PlayheadIndicator from './ui/PlayheadIndicator.vue'
import TimelineTrack from './TimelineTrack.vue'
import { useNotesStore } from '@/store/useNotes'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useInstrumentStore } from '@/store/useInstrument'
import { usePlayback } from '@/composables/usePlayback'
import { useGrid } from '@/composables/useGrid'

const store = useNotesStore()
const transport = useTransportStore()
const settings = useTimelineSettingsStore()
const instrument = useInstrumentStore()

const { tempo } = storeToRefs(transport)
const { selectedMode, lastRhythmMode, snapEnabled, beatTop, beatBottom } = storeToRefs(settings)
const { numStrings } = storeToRefs(instrument)

const grid = useGrid()

const stepMap = { '1/16': 0.25, '1/8': 0.5, '1/4': 1, '1/2': 2, '1': 4 }
const effectiveMode = computed(() => (selectedMode.value === 'sim' ? lastRhythmMode.value : selectedMode.value))
const currentStep = computed(() => stepMap[effectiveMode.value] ?? 1)

const notesForRender = computed(() => {
  return store.activeNotes.map((note, idx) => {
    const key = note?.key
    const fret = note?.fret
    const string = note?.string
    const color = note?.color
    // 1-based raster index stored per note (fallback to insertion order)
    const gridIndex = Number.isFinite(note?.gridIndex) ? note.gridIndex : (idx + 1)
    const lengthBlocks = Number.isFinite(note?.lengthBlocks) ? note.lengthBlocks : 1
    return { key, fret, string, color, gridIndex, lengthBlocks }
  })
})

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
  else playback.start(totalDuration.value, transport.tempo)
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
