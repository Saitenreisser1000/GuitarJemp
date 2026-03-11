import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextTextId = 1

function clampPercent(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

export const useFretboardOverlayStore = defineStore('fretboardOverlay', () => {
  const placementArmed = ref(false)
  const textItems = ref([])

  function armTextPlacement() {
    placementArmed.value = true
  }

  function setPlacementArmed(v) {
    placementArmed.value = Boolean(v)
  }

  function addTextItem({ xPct, yPct, text = '', gridIndex = 1, lengthBlocks = 4 } = {}) {
    const item = {
      id: `txt_${nextTextId++}`,
      xPct: clampPercent(xPct),
      yPct: clampPercent(yPct),
      text: String(text ?? ''),
      gridIndex: Number.isFinite(Number(gridIndex)) && Number(gridIndex) > 0 ? Number(gridIndex) : 1,
      lengthBlocks:
        Number.isFinite(Number(lengthBlocks)) && Number(lengthBlocks) > 0 ? Number(lengthBlocks) : 4,
    }
    textItems.value.push(item)
    return item
  }

  function setTextItems(items) {
    textItems.value = Array.isArray(items)
      ? items.map((item) => ({
        id: String(item?.id || `txt_${nextTextId++}`),
        xPct: clampPercent(item?.xPct),
        yPct: clampPercent(item?.yPct),
        text: String(item?.text ?? ''),
        gridIndex:
          Number.isFinite(Number(item?.gridIndex)) && Number(item?.gridIndex) > 0
            ? Number(item.gridIndex)
            : 1,
        lengthBlocks:
          Number.isFinite(Number(item?.lengthBlocks)) && Number(item?.lengthBlocks) > 0
            ? Number(item.lengthBlocks)
            : 4,
      }))
      : []
  }

  function updateTextItemPosition(id, { xPct, yPct } = {}) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    textItems.value[idx].xPct = clampPercent(xPct)
    textItems.value[idx].yPct = clampPercent(yPct)
  }

  function updateTextItemText(id, text) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    textItems.value[idx].text = String(text ?? '')
  }

  function updateTextItemTiming(id, { gridIndex, lengthBlocks } = {}) {
    const key = String(id || '')
    const idx = textItems.value.findIndex((x) => String(x?.id) === key)
    if (idx < 0) return
    if (gridIndex != null) {
      const nextGrid = Number(gridIndex)
      textItems.value[idx].gridIndex =
        Number.isFinite(nextGrid) && nextGrid > 0 ? nextGrid : textItems.value[idx].gridIndex
    }
    if (lengthBlocks != null) {
      const nextLength = Number(lengthBlocks)
      textItems.value[idx].lengthBlocks =
        Number.isFinite(nextLength) && nextLength > 0 ? nextLength : textItems.value[idx].lengthBlocks
    }
  }

  function removeTextItem(id) {
    const key = String(id || '')
    if (!key) return
    textItems.value = textItems.value.filter((x) => String(x?.id) !== key)
  }

  return {
    placementArmed,
    textItems,
    armTextPlacement,
    setPlacementArmed,
    addTextItem,
    setTextItems,
    updateTextItemPosition,
    updateTextItemText,
    updateTextItemTiming,
    removeTextItem,
  }
})
