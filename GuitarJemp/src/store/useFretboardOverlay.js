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

  function addTextItem({ xPct, yPct, text = '' } = {}) {
    const item = {
      id: `txt_${nextTextId++}`,
      xPct: clampPercent(xPct),
      yPct: clampPercent(yPct),
      text: String(text ?? ''),
    }
    textItems.value.push(item)
    return item
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
    updateTextItemPosition,
    updateTextItemText,
    removeTextItem,
  }
})
