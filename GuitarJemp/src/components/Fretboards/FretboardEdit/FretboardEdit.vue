<template>
  <div class="fretboard-container">
    <FretboardControls @update-frets="(n) => emit('update-frets', n)">
      <template #after-frets>
        <div class="top-tools">
          <ColorPalette orientation="horizontal" />
        </div>
      </template>
    </FretboardControls>

    <div class="fretboard">
      <div class="fretboard-scroll">
        <div class="strings-container">
          <StringTrack v-for="string in numStrings" :key="string" :string-number="string" :num-strings="numStrings"
            :num-frets="props.numFrets" :active-notes="activeNotes" :selected-fret="selectedFretString?.fret ?? null"
            :selected-string="selectedFretString?.string ?? null" :open-midi="openMidiForString(string)"
            @toggle-note="toggleNote" />
        </div>

        <div class="fret-numbers">
          <div class="fret-number fret-number-open">0</div>
          <div class="nut-spacer" aria-hidden="true"></div>
          <div v-for="fret in props.numFrets" :key="fret" class="fret-number">{{ fret }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'FretboardEdit' })
import { computed } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useSelectionStore } from '@/store/useSelection'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import FretboardControls from './controls/FretboardControls.vue'
import ColorPalette from './controls/ColorPalette.vue'
import StringTrack from './ui/StringTrack.vue'
import { getTuning } from '@/domain/music/tunings'
import { midiForFretStringKey } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'

const store = useNotesStore()
const instrument = useInstrumentStore()
const selection = useSelectionStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()

const props = defineProps({
  numFrets: { type: Number, required: true },
})

const emit = defineEmits(['update-frets'])

const numStrings = computed(() => instrument.numStrings)
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
  const note = store.addNote(key)

  if (!settings.soundPreviewEnabled) return
  const t = tuning.value
  const midi = midiForFretStringKey(key, t)
  if (Number.isFinite(Number(midi))) {
    const durationPlayheadMs = store.getNoteDurationMs(note)
    const tempoValue = Number(transport.tempo) || 120
    const tempoScale = 120 / tempoValue
    const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale)

    void playMidi(midi, {
      durationMs: durationAudioMs,
      instrumentType: instrument.instrumentType,
    })
  }
}
</script>

<style scoped>
.fretboard-container {
  padding: 20px;
}

.top-tools {
  display: flex;
  align-items: center;
  gap: 12px;
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
  padding-bottom: 6px;
  /* gives the scrollbar some breathing room */
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
  width: 80px;
  /* same width as .fret-position */
  text-align: center;
  padding: 6px 0;
  color: rgba(40, 40, 40, 0.7);
  font-weight: bold;
}

.fret-number-open {
  width: 40px;
}
</style>
