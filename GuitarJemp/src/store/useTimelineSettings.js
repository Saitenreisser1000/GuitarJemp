import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'guitarjemp.timelineSettings.v1'

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStorage(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export const useTimelineSettingsStore = defineStore('timelineSettings', () => {
  const stored = readStorage() ?? {}

  const selectedMode = ref(typeof stored.selectedMode === 'string' ? stored.selectedMode : '1/4')
  const lastRhythmMode = ref(typeof stored.lastRhythmMode === 'string' ? stored.lastRhythmMode : '1/4')
  const snapEnabled = ref(typeof stored.snapEnabled === 'boolean' ? stored.snapEnabled : true)
  const beatTop = ref(Number.isFinite(stored.beatTop) ? stored.beatTop : 4)
  const beatBottom = ref([1, 2, 4, 8].includes(stored.beatBottom) ? stored.beatBottom : 4)
  const selectedColor = ref(typeof stored.selectedColor === 'string' ? stored.selectedColor : '#FF6B6B')

  function setSelectedMode(m) {
    const mode = String(m)
    selectedMode.value = mode
    if (mode !== 'sim') lastRhythmMode.value = mode
  }

  function setSnapEnabled(v) {
    snapEnabled.value = Boolean(v)
  }

  function setBeatTop(v) {
    const n = Number.parseInt(v, 10)
    beatTop.value = Number.isFinite(n) && n > 0 ? n : 1
  }

  function setBeatBottom(v) {
    const n = Number.parseInt(v, 10)
    beatBottom.value = [1, 2, 4, 8].includes(n) ? n : 4
  }

  function setSelectedColor(color) {
    selectedColor.value = String(color)
  }

  watch([selectedMode, lastRhythmMode, snapEnabled, beatTop, beatBottom, selectedColor], () => {
    writeStorage({
      selectedMode: selectedMode.value,
      lastRhythmMode: lastRhythmMode.value,
      snapEnabled: snapEnabled.value,
      beatTop: beatTop.value,
      beatBottom: beatBottom.value,
      selectedColor: selectedColor.value
    })
  })

  return {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    beatTop,
    beatBottom,
    selectedColor,
    setSelectedMode,
    setSnapEnabled,
    setBeatTop,
    setBeatBottom,
    setSelectedColor
  }
})
