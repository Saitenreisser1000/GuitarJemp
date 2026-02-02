<template>
  <div class="active-tones-window">
    <div class="header-row">
      <h2>Aktive Noten</h2>
      <button class="clear-btn" type="button" :disabled="activeNotes.length === 0" @click="clearAll">
        Clear
      </button>
    </div>
    <div class="tones-list">
      <div v-if="activeNotes.length === 0" class="empty-message">Keine aktiven Noten</div>
      <div v-else>
        <div
          v-for="note in sortedActiveNotes"
          :key="note.key"
          class="tone-item"
          :class="{ 'is-selected': isSelected(note.key) }"
          @click="selectNote(note.key)"
        >
          <div class="tone-left">
            <span class="tone-color" :style="{ backgroundColor: note.color ?? '#d32f2f' }" />
            <span class="tone-label">
              Bund {{ note.fret }}, Saite {{ note.string }}
              <span class="tone-pitch">{{ pitchLabelFor(note) }}</span>
            </span>
          </div>
          <button class="remove-btn" @click.stop="removeNote(note.key)">✕</button>
        </div>
      </div>
    </div>
    <div class="info">
      <p><strong>Insgesamt:</strong> {{ activeNotes.length }} aktive Note(n)</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useInstrumentStore } from '@/store/useInstrument'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'

defineOptions({ name: 'ActiveTonesWindow' })

const store = useNotesStore()
const selection = useSelectionStore()
const instrument = useInstrumentStore()
const activeNotes = computed(() => store.activeNotes)
const selectedNoteKey = computed(() => selection.selectedNoteKey)

function isSelected(noteKey) {
  return selection.isSelected(noteKey)
}

const tuning = computed(() => getTuning(instrument.tuningId))

const sortedActiveNotes = computed(() => {
  return [...activeNotes.value].sort((a, b) => {
    const ga = Number.isFinite(a?.gridIndex) ? a.gridIndex : 0
    const gb = Number.isFinite(b?.gridIndex) ? b.gridIndex : 0
    if (ga !== gb) return ga - gb
    if (a.fret !== b.fret) return a.fret - b.fret
    return a.string - b.string
  })
})

function selectNote(noteKey) {
  selection.selectNote(noteKey)
}

function removeNote(noteKey) {
  if (selection.selectedNoteKey === String(noteKey)) selection.clearSelection()
  store.removeNote(noteKey)
}

function pitchLabelFor(note) {
  const t = tuning.value
  if (!t) return ''
  const stringIdx = Number(note?.string) - 1
  const open = t.openMidi?.[stringIdx]
  if (!Number.isFinite(Number(open))) return ''
  const fret = Number.isFinite(Number(note?.fret)) ? Number(note.fret) : 0
  const midi = Number(open) + fret
  return midiToNoteName(midi, { includeOctave: true })
}

function clearAll() {
  selection.clearSelection()
  store.clearNotes()
}
</script>

<style scoped>
.active-tones-window {
  padding: 20px;
  border: 2px solid #333;
  border-radius: 4px;
  background-color: #f9f9f9;
  max-width: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.header-row h2 {
  margin-top: 0;
  margin-bottom: 0;
  color: #333;
  font-size: 18px;
}

.clear-btn {
  background: #eee;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 700;
}

.clear-btn:hover:enabled {
  background: #e2e2e2;
}

.clear-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tones-list {
  margin-bottom: 15px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-color: white;
}

.empty-message {
  padding: 15px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.tone-item {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
  cursor: pointer;
}

.tone-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tone-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.tone-item.is-selected {
  background-color: rgba(102, 126, 234, 0.15);
  outline: 2px solid rgba(102, 126, 234, 0.75);
  outline-offset: -2px;
}

.tone-item:last-child {
  border-bottom: none;
}

.tone-item:hover {
  background-color: #f5f5f5;
}

.tone-label {
  color: #333;
  font-weight: 500;
}

.remove-btn {
  background-color: #d32f2f;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.remove-btn:hover {
  background-color: #b71c1c;
}

.info {
  padding-top: 10px;
  border-top: 1px solid #ddd;
  text-align: center;
}

.info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
.tone-pitch {
  margin-left: 8px;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
}
</style>
