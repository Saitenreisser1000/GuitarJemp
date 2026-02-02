import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSelectionStore = defineStore('selection', () => {
  const selectedNoteKey = ref(null)
  const selectedNoteKeys = ref([])

  // Transient group transforms (used for live preview while dragging/resizing)
  const groupDragActive = ref(false)
  const groupDragDeltaBlocks = ref(0)
  const groupResizeActive = ref(false)
  const groupResizeDeltaBlocks = ref(0)

  function normalizeKeys(keys) {
    if (!Array.isArray(keys)) return []
    const unique = []
    const seen = new Set()
    for (const k of keys) {
      const s = k != null ? String(k) : ''
      if (!s || seen.has(s)) continue
      seen.add(s)
      unique.push(s)
    }
    return unique
  }

  function selectNote(noteKey) {
    const key = noteKey != null ? String(noteKey) : null
    selectedNoteKey.value = key
    selectedNoteKeys.value = key ? [key] : []
  }

  function setSelectedNotes(noteKeys) {
    const keys = normalizeKeys(noteKeys)
    selectedNoteKeys.value = keys
    selectedNoteKey.value = keys[0] ?? null
  }

  function isSelected(noteKey) {
    const key = noteKey != null ? String(noteKey) : ''
    if (!key) return false
    // Fast path: single selection
    if (selectedNoteKey.value === key) return true
    return selectedNoteKeys.value.includes(key)
  }

  function clearSelection() {
    selectedNoteKey.value = null
    selectedNoteKeys.value = []
  }

  function setGroupDrag(active, deltaBlocks = 0) {
    groupDragActive.value = Boolean(active)
    groupDragDeltaBlocks.value = Number(deltaBlocks) || 0
  }

  function setGroupResize(active, deltaBlocks = 0) {
    groupResizeActive.value = Boolean(active)
    groupResizeDeltaBlocks.value = Number(deltaBlocks) || 0
  }

  function clearGroupTransforms() {
    groupDragActive.value = false
    groupDragDeltaBlocks.value = 0
    groupResizeActive.value = false
    groupResizeDeltaBlocks.value = 0
  }

  return {
    selectedNoteKey,
    selectedNoteKeys,
    groupDragActive,
    groupDragDeltaBlocks,
    groupResizeActive,
    groupResizeDeltaBlocks,
    selectNote,
    setSelectedNotes,
    isSelected,
    clearSelection,
    setGroupDrag,
    setGroupResize,
    clearGroupTransforms,
  }
})
