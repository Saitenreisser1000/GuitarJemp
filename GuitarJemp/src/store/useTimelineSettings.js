import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readJson } from '@/infra/storage/jsonStorage'
import { persistRefs } from '@/infra/pinia/persistRefs'
import { DEFAULT_GRID_SIZE_PX } from '@/config/grid'

const STORAGE_KEY = 'guitarjemp.timelineSettings.v1'

export const useTimelineSettingsStore = defineStore('timelineSettings', () => {
  const stored = readJson(STORAGE_KEY) ?? {}

  const selectedMode = ref(typeof stored.selectedMode === 'string' ? stored.selectedMode : '1/4')
  const lastRhythmMode = ref(
    typeof stored.lastRhythmMode === 'string' ? stored.lastRhythmMode : '1/4',
  )
  const snapEnabled = ref(typeof stored.snapEnabled === 'boolean' ? stored.snapEnabled : true)
  const soundPreviewEnabled = ref(
    typeof stored.soundPreviewEnabled === 'boolean' ? stored.soundPreviewEnabled : true,
  )
  const loopEnabled = ref(typeof stored.loopEnabled === 'boolean' ? stored.loopEnabled : false)
  const beatTop = ref(Number.isFinite(stored.beatTop) ? stored.beatTop : 4)
  const beatBottom = ref([1, 2, 4, 8].includes(stored.beatBottom) ? stored.beatBottom : 4)
  const zoomPxPerBlock = ref(
    Number.isFinite(stored.zoomPxPerBlock) && stored.zoomPxPerBlock > 0
      ? stored.zoomPxPerBlock
      : DEFAULT_GRID_SIZE_PX,
  )
  const selectedColor = ref(
    typeof stored.selectedColor === 'string' ? stored.selectedColor : '#FF6B6B',
  )

  function setSelectedMode(m) {
    const mode = String(m)
    selectedMode.value = mode
    if (mode !== 'sim') lastRhythmMode.value = mode
  }

  function setSnapEnabled(v) {
    snapEnabled.value = Boolean(v)
  }

  function setSoundPreviewEnabled(v) {
    soundPreviewEnabled.value = Boolean(v)
  }

  function setLoopEnabled(v) {
    loopEnabled.value = Boolean(v)
  }

  function setBeatTop(v) {
    const n = Number.parseInt(v, 10)
    beatTop.value = Number.isFinite(n) && n > 0 ? n : 1
  }

  function setBeatBottom(v) {
    const n = Number.parseInt(v, 10)
    beatBottom.value = [1, 2, 4, 8].includes(n) ? n : 4
  }

  function setZoomPxPerBlock(v) {
    const n = Number(v)
    // Keep sane bounds; UI can still clamp more tightly.
    zoomPxPerBlock.value = Number.isFinite(n) ? Math.min(200, Math.max(8, n)) : DEFAULT_GRID_SIZE_PX
  }

  function setSelectedColor(color) {
    selectedColor.value = String(color)
  }

  persistRefs(STORAGE_KEY, {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    soundPreviewEnabled,
    loopEnabled,
    beatTop,
    beatBottom,
    zoomPxPerBlock,
    selectedColor,
  })

  return {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    soundPreviewEnabled,
    loopEnabled,
    beatTop,
    beatBottom,
    zoomPxPerBlock,
    selectedColor,
    setSelectedMode,
    setSnapEnabled,
    setSoundPreviewEnabled,
    setLoopEnabled,
    setBeatTop,
    setBeatBottom,
    setZoomPxPerBlock,
    setSelectedColor,
  }
})
