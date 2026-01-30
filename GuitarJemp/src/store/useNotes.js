import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useNotesStore = defineStore('notes', () => {
  // Notes are objects.
  // key: "fret-string" (e.g. "3-1")
  // gridIndex: 1-based raster position (1,2,3,...) independent of string
  // timeMs: timeline time at placement time (kept for later use)
  // lengthBlocks: note length in raster blocks (can be fractional, e.g. 0.25)
  // durationMs: derived from lengthBlocks (kept for later use)
  // placedAtMs: wall-clock timestamp when note was created
  const activeNotes = ref([])
  const tempo = ref(120)
  const playState = ref('stopped') // 'playing' | 'stopped'
  const selectedMode = ref('1/4') // '1/16', '1/8', '1/4', '1/2', '1'
  const lastRhythmMode = ref('1/4') // remembers last non-'sim' selection
  const numStrings = ref(6)

  // Keep this in sync with useGrid() defaults
  const TIME_PER_BLOCK_MS = 500

  const DEFAULT_LENGTH_BLOCKS = 1

  function defaultLengthBlocksForMode(mode) {
    switch (mode) {
      case '1/16':
        return 0.25
      case '1/8':
        return 0.5
      case '1/4':
        return 1
      case '1/2':
        return 2
      case '1':
        return 4
      default:
        return DEFAULT_LENGTH_BLOCKS
    }
  }

  function keyFor(fret, string) {
    return `${fret}-${string}`
  }

  function parseKey(key) {
    const [fret, string] = String(key).split('-').map(Number)
    return { fret, string }
  }

  function gridIndexToTimeMs(gridIndex) {
    const i = Number(gridIndex)
    const safe = Number.isFinite(i) && i > 0 ? i : 1
    return (safe - 1) * TIME_PER_BLOCK_MS
  }

  function getNextGridIndex() {
    if (activeNotes.value.length === 0) return 1

    // Use the most recently created note (last in array) as the placement cursor.
    const last = activeNotes.value[activeNotes.value.length - 1]
    const lastGridIndexRaw = Number(last?.gridIndex)
    const lastLengthRaw = Number(last?.lengthBlocks)

    const lastGridIndex = Number.isFinite(lastGridIndexRaw) && lastGridIndexRaw > 0 ? lastGridIndexRaw : 1
    const lastLength = Number.isFinite(lastLengthRaw) && lastLengthRaw > 0 ? lastLengthRaw : DEFAULT_LENGTH_BLOCKS

    // 'sim' mode: keep x position for the next note
    if (selectedMode.value === 'sim') return lastGridIndex

    // Default: place directly at the end of the previous note.
    return lastGridIndex + lastLength
  }

  function findIndexByKey(key) {
    return activeNotes.value.findIndex((n) => n?.key === key)
  }

  function createNoteFromKey(key) {
    const { fret, string } = parseKey(key)
    const gridIndex = getNextGridIndex()
    const lengthMode = selectedMode.value === 'sim' ? lastRhythmMode.value : selectedMode.value
    const lengthBlocks = defaultLengthBlocksForMode(lengthMode)
    return {
      key: keyFor(fret, string),
      fret,
      string,
      gridIndex,
      timeMs: gridIndexToTimeMs(gridIndex),
      lengthBlocks,
      durationMs: lengthBlocks * TIME_PER_BLOCK_MS,
      placedAtMs: Date.now()
    }
  }

  function setNoteGridIndex(key, gridIndex) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return
    const i = Number(gridIndex)
    const safe = Number.isFinite(i) && i > 0 ? i : 1
    activeNotes.value[idx].gridIndex = safe
    activeNotes.value[idx].timeMs = gridIndexToTimeMs(safe)
  }

  function setNoteLength(key, lengthBlocks) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return

    const n = Number(lengthBlocks)
    const safe = Number.isFinite(n) && n > 0 ? n : DEFAULT_LENGTH_BLOCKS
    activeNotes.value[idx].lengthBlocks = safe
    activeNotes.value[idx].durationMs = safe * TIME_PER_BLOCK_MS
  }

  // For later: allow explicit time update if needed
  function setNoteTime(key, timeMs) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return
    const t = Number(timeMs)
    activeNotes.value[idx].timeMs = Number.isFinite(t) && t >= 0 ? t : 0
  }

  function setNotes(notesArray) {
    // Accept both legacy keys and note-objects.
    const normalized = []
    for (const item of notesArray ?? []) {
      if (typeof item === 'string') {
        normalized.push(createNoteFromKey(item))
      } else if (item && typeof item === 'object') {
        const key = item.key ?? keyFor(item.fret, item.string)
        const { fret, string } = item.fret != null && item.string != null ? item : parseKey(key)
        const gridIndex = Number.isFinite(item.gridIndex) && item.gridIndex > 0 ? item.gridIndex : (normalized.length + 1)
        const lengthBlocks = Number.isFinite(item.lengthBlocks) && item.lengthBlocks > 0
          ? item.lengthBlocks
          : DEFAULT_LENGTH_BLOCKS
        normalized.push({
          key,
          fret,
          string,
          gridIndex,
          timeMs: Number.isFinite(item.timeMs) ? item.timeMs : gridIndexToTimeMs(gridIndex),
          lengthBlocks,
          durationMs: Number.isFinite(item.durationMs) ? item.durationMs : (lengthBlocks * TIME_PER_BLOCK_MS),
          placedAtMs: Number.isFinite(item.placedAtMs) ? item.placedAtMs : Date.now()
        })
      }
    }
    activeNotes.value = normalized
  }

  function addNote(key) {
    const k = String(key)
    if (findIndexByKey(k) !== -1) return
    activeNotes.value.push(createNoteFromKey(k))
  }

  function removeNote(key) {
    const i = findIndexByKey(String(key))
    if (i > -1) activeNotes.value.splice(i, 1)
  }

  function toggleNote(key) {
    const k = String(key)
    const i = findIndexByKey(k)
    if (i > -1) activeNotes.value.splice(i, 1)
    else activeNotes.value.push(createNoteFromKey(k))
  }

  function clearNotes() {
    activeNotes.value = []
  }

  function setTempo(t) {
    tempo.value = t
  }

  function setPlayState(s) {
    playState.value = s
  }

  function setSelectedMode(m) {
    const mode = String(m)
    selectedMode.value = mode
    if (mode !== 'sim') lastRhythmMode.value = mode
  }

  function setNumStrings(n) {
    numStrings.value = n
  }

  return {
    activeNotes,
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
    setNoteGridIndex,
    setNoteLength,
    setTempo,
    setPlayState,
    setSelectedMode,
    setNumStrings
  }
})
