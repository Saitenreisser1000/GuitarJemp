import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useNotesStore = defineStore('notes', () => {
  const activeNotes = ref([]) // array of "fret-string" keys like "3-1"
  // key -> time in ms (Timeline position)
  const noteTimes = ref({})
  const tempo = ref(120)
  const playState = ref('stopped') // 'playing' | 'stopped'
  const selectedMode = ref('1/4') // '1/16', '1/8', '1/4', '1/2', '1'
  const numStrings = ref(6)

  // Keep this in sync with useGrid() defaults
  const TIME_PER_BLOCK_MS = 500

  function getNextNoteTime() {
    const times = Object.values(noteTimes.value)
    if (times.length === 0) return 0
    const maxTime = Math.max(...times.map(t => (Number.isFinite(t) ? t : 0)))
    return maxTime + TIME_PER_BLOCK_MS
  }

  function ensureNoteTime(key) {
    if (noteTimes.value[key] == null) {
      noteTimes.value[key] = getNextNoteTime()
    }
  }

  function setNoteTime(key, timeMs) {
    const t = Number(timeMs)
    noteTimes.value[key] = Number.isFinite(t) && t >= 0 ? t : 0
  }

  function setNotes(notesArray) {
    activeNotes.value = [...notesArray]
    // ensure all active notes have a time
    for (const key of activeNotes.value) ensureNoteTime(key)
  }

  function addNote(key) {
    if (!activeNotes.value.includes(key)) {
      activeNotes.value.push(key)
      ensureNoteTime(key)
    }
  }

  function removeNote(key) {
    const i = activeNotes.value.indexOf(key)
    if (i > -1) activeNotes.value.splice(i, 1)
    if (key in noteTimes.value) delete noteTimes.value[key]
  }

  function toggleNote(key) {
    const i = activeNotes.value.indexOf(key)
    if (i > -1) activeNotes.value.splice(i, 1)
    else {
      activeNotes.value.push(key)
      ensureNoteTime(key)
    }

    if (i > -1 && key in noteTimes.value) delete noteTimes.value[key]
  }

  function clearNotes() {
    activeNotes.value = []
    noteTimes.value = {}
  }

  // Keep times in sync even across HMR/reordering
  watch(
    activeNotes,
    (keys) => {
      // ensure all active notes have a time
      for (const key of keys) ensureNoteTime(key)

      // drop orphaned times
      const keySet = new Set(keys)
      for (const existingKey of Object.keys(noteTimes.value)) {
        if (!keySet.has(existingKey)) delete noteTimes.value[existingKey]
      }
    },
    { immediate: true }
  )

  function setTempo(t) {
    tempo.value = t
  }

  function setPlayState(s) {
    playState.value = s
  }

  function setSelectedMode(m) {
    selectedMode.value = m
  }

  function setNumStrings(n) {
    numStrings.value = n
  }

  return {
    activeNotes,
    noteTimes,
    tempo,
    playState,
    selectedMode,
    numStrings,
    setNotes,
    addNote,
    removeNote,
    toggleNote,
    clearNotes,
    setNoteTime,
    setTempo,
    setPlayState,
    setSelectedMode,
    setNumStrings
  }
})
