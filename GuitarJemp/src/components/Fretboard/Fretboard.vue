<template>
  <div class="fretboard-container">
    <FretboardControls @update-frets="(n) => (numFrets = n)">
      <template #after-frets>
        <div class="top-tools">
          <ColorPalette orientation="horizontal" />
          <div class="view-toggle" role="group" aria-label="Fretboard Ansicht">
            <button
              type="button"
              class="view-btn"
              :class="{ active: viewMode === 'grid' }"
              @click="viewMode = 'grid'"
            >
              Grid
            </button>
            <button
              type="button"
              class="view-btn"
              :class="{ active: viewMode === 'diagram' }"
              @click="viewMode = 'diagram'"
            >
              Diagramm
            </button>
          </div>
        </div>
      </template>
    </FretboardControls>

    <div class="fretboard">
      <div class="fretboard-scroll">
        <template v-if="viewMode === 'grid'">
          <div class="strings-container">
            <StringTrack
              v-for="string in numStrings"
              :key="string"
              :string-number="string"
              :num-strings="numStrings"
              :num-frets="numFrets"
              :active-notes="activeNotes"
              :selected-fret="selectedFretString?.fret ?? null"
              :selected-string="selectedFretString?.string ?? null"
              :open-midi="openMidiForString(string)"
              @toggle-note="toggleNote"
            />
          </div>

          <div class="fret-numbers">
            <div class="fret-number fret-number-open">0</div>
            <div class="nut-spacer" aria-hidden="true"></div>
            <div v-for="fret in numFrets" :key="fret" class="fret-number">{{ fret }}</div>
          </div>
        </template>

        <template v-else>
          <FretboardJs :num-frets="numFrets" />
        </template>
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
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import FretboardControls from './controls/FretboardControls.vue'
import ColorPalette from './controls/ColorPalette.vue'
import StringTrack from './ui/StringTrack.vue'
import FretboardJs from './FretboardJs.vue'
import { getTuning } from '@/domain/music/tunings'
import { midiForFretStringKey } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()

const numStrings = computed(() => instrument.numStrings)
const numFrets = ref(12)
const viewMode = ref('grid')
const activeNotes = computed(() => store.activeNotes)

const tuning = computed(() => getTuning(instrument.tuningId))

function openMidiForString(stringNumber) {
  const t = tuning.value
  if (!t) return null
  const idx = Number(stringNumber) - 1
  const v = t.openMidi?.[idx]
  return Number.isFinite(Number(v)) ? Number(v) : null
}

const selectedFretString = computed(() => {
  const key = selection.selectedNoteKey
  if (!key) return null
  const note = store.activeNotes.find((n) => n?.key === key)
  if (!note) return null
  return { fret: note.fret, string: note.string }
})

function toggleNote(key) {
  store.addNote(key)

  if (!settings.soundPreviewEnabled) return
  const t = tuning.value
  const midi = midiForFretStringKey(key, t)
  if (Number.isFinite(Number(midi))) void playMidi(midi)
}
</script>

<style scoped>
.fretboard-container { padding:20px }

.top-tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.view-toggle {
  display: inline-flex;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 6px;
  overflow: hidden;
}

.view-btn {
  border: none;
  background: rgba(255, 255, 255, 0.85);
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 700;
}

.view-btn.active {
  background: #667eea;
  color: white;
}
.fretboard {
  flex: 1;
  margin-top: 10px;
  max-width: 100%;
}

.fretboard-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  padding-bottom: 6px; /* gives the scrollbar some breathing room */
}

.strings-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: max-content;
  width: fit-content;
}

/* horizontal fret numbers aligned with frets */
.fret-numbers {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  width: max-content;
  width: fit-content;
}

.nut-spacer {
  width: 15px;
  height: 100%;
}
.fret-number {
  width: 80px; /* same width as .fret-position */
  text-align: center;
  padding: 6px 0;
  color: rgba(40, 40, 40, 0.7);
  font-weight: bold;
}

.fret-number-open {
  width: 40px;
}
</style>
