import { defineStore } from 'pinia'
import { ref } from 'vue'
import { createNoteKey, parseFretStringKey, normalizeNote } from '@/domain/note'
import { defaultLengthBlocksForMode, nextGridIndexFromNotes } from '@/domain/timelinePlacement'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { DEFAULT_TIME_PER_BLOCK_MS } from '@/config/grid'

export const useNotesStore = defineStore('notes', () => {
  // Notes are objects.
  // key: "fret-string" (e.g. "3-1")
  // gridIndex: 1-based raster position (can be fractional)
  // lengthBlocks: note length in raster blocks (can be fractional, e.g. 0.25)
  // placedAtMs: wall-clock timestamp when note was created
  const activeNotes = ref([])

  const TIME_PER_BLOCK_MS = DEFAULT_TIME_PER_BLOCK_MS

  function gridIndexToTimeMs(gridIndex) {
    const i = Number(gridIndex)
    const safe = Number.isFinite(i) && i > 0 ? i : 1
    return (safe - 1) * TIME_PER_BLOCK_MS
  }

  function lengthBlocksToDurationMs(lengthBlocks) {
    const n = Number(lengthBlocks)
    const safe = Number.isFinite(n) && n > 0 ? n : 1
    return safe * TIME_PER_BLOCK_MS
  }

  function findIndexByKey(key) {
    return activeNotes.value.findIndex((n) => n?.key === key)
  }

  function createNoteFromKey(key) {
    const settings = useTimelineSettingsStore()
    const transport = useTransportStore()
    const { fret, string } = parseFretStringKey(key)

    // Default placement: append after existing notes.
    let gridIndex = nextGridIndexFromNotes(activeNotes.value, { mode: settings.selectedMode })

    // If user moved the playhead, new notes start at the playhead.
    const tMs = Number(transport.playheadMs)
    if (Number.isFinite(tMs) && tMs > 0) {
      const idx = tMs / TIME_PER_BLOCK_MS + 1
      if (Number.isFinite(idx) && idx > 0) gridIndex = idx
    }

    const lengthMode =
      settings.selectedMode === 'sim' ? settings.lastRhythmMode : settings.selectedMode
    const lengthBlocks = defaultLengthBlocksForMode(lengthMode)
    return {
      key: createNoteKey(),
      fret,
      string,
      color: settings.selectedColor,
      gridIndex,
      lengthBlocks,
      placedAtMs: Date.now(),
    }
  }

  function setNoteGridIndex(key, gridIndex) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return
    const i = Number(gridIndex)
    const safe = Number.isFinite(i) && i > 0 ? i : 1
    activeNotes.value[idx].gridIndex = safe
  }

  function setNoteLength(key, lengthBlocks) {
    const idx = findIndexByKey(String(key))
    if (idx === -1) return

    const n = Number(lengthBlocks)
    const safe = Number.isFinite(n) && n > 0 ? n : 1
    activeNotes.value[idx].lengthBlocks = safe
  }

  function setNotes(notesArray) {
    // Accept both legacy keys and note-objects; normalize to the canonical note shape.
    const normalized = []
    for (const item of notesArray ?? []) {
      const note = normalizeNote(item, { fallbackGridIndex: normalized.length + 1 })
      if (note) normalized.push(note)
    }

    activeNotes.value = normalized
  }

  function addNote(key) {
    const k = String(key)
    const note = createNoteFromKey(k)
    activeNotes.value.push(note)
    return note
  }

  function removeNote(key) {
    const i = findIndexByKey(String(key))
    if (i > -1) activeNotes.value.splice(i, 1)
  }

  function toggleNote(key) {
    // Compatibility: fretboard used to toggle by fret-string key.
    // New behavior: always add a new note event.
    return addNote(key)
  }

  function clearNotes() {
    activeNotes.value = []
  }

  // Derived time helpers (raster is source of truth)
  function getNoteTimeMs(note) {
    return gridIndexToTimeMs(note?.gridIndex)
  }

  function getNoteDurationMs(note) {
    return lengthBlocksToDurationMs(note?.lengthBlocks)
  }

  return {
    activeNotes,
    setNotes,
    addNote,
    removeNote,
    toggleNote,
    clearNotes,
    setNoteGridIndex,
    setNoteLength,
    getNoteTimeMs,
    getNoteDurationMs,
  }
})
