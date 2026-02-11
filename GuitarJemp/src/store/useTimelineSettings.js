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
  const soundDurationScale = ref(
    Number.isFinite(stored.soundDurationScale) && stored.soundDurationScale > 0
      ? stored.soundDurationScale
      : 1,
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

  const activeString = ref(
    Number.isFinite(stored.activeString) && stored.activeString > 0
      ? Math.floor(stored.activeString)
      : 1,
  )

  const activeTool = ref(stored.activeTool === 'select' ? 'select' : 'arrow')
  const simGroupMode = ref(
    typeof stored.simGroupMode === 'string' ? stored.simGroupMode : '',
  )

  const stringsCollapsed = ref(
    typeof stored.stringsCollapsed === 'boolean' ? stored.stringsCollapsed : false,
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

  function setSoundDurationScale(v) {
    const n = Number(v)
    soundDurationScale.value = Number.isFinite(n) && n > 0 ? Math.min(16, Math.max(0.1, n)) : 1
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

  function setActiveString(v) {
    const n = Number.parseInt(String(v), 10)
    activeString.value = Number.isFinite(n) && n > 0 ? n : 1
  }

  function setActiveTool(v) {
    const next = String(v)
    activeTool.value = next === 'select' ? 'select' : 'arrow'
  }

  function setStringsCollapsed(v) {
    stringsCollapsed.value = Boolean(v)
  }

  function setSimGroupMode(v) {
    const next = String(v || '')
    simGroupMode.value = next === 'dot' || next === '3' ? next : ''
  }

  persistRefs(STORAGE_KEY, {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    soundPreviewEnabled,
    soundDurationScale,
    loopEnabled,
    beatTop,
    beatBottom,
    zoomPxPerBlock,
    selectedColor,
    activeString,
    activeTool,
    stringsCollapsed,
    simGroupMode,
  })

  return {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    soundPreviewEnabled,
    soundDurationScale,
    loopEnabled,
    beatTop,
    beatBottom,
    zoomPxPerBlock,
    selectedColor,
    activeString,
    activeTool,
    stringsCollapsed,
    simGroupMode,
    setSelectedMode,
    setSnapEnabled,
    setSoundPreviewEnabled,
    setSoundDurationScale,
    setLoopEnabled,
    setBeatTop,
    setBeatBottom,
    setZoomPxPerBlock,
    setSelectedColor,
    setActiveString,
    setActiveTool,
    setStringsCollapsed,
    setSimGroupMode,
  }
})
