import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const selectedNoteKey = ref(null)

  function selectNote(noteKey) {
    selectedNoteKey.value = noteKey != null ? String(noteKey) : null
  }

  function clearSelection() {
    selectedNoteKey.value = null
  }

  return { selectedNoteKey, selectNote, clearSelection }
})
