import { defineStore } from 'pinia'
import { ref } from 'vue'
import { readJson } from '@/infra/storage/jsonStorage'
import { persistRefs } from '@/infra/pinia/persistRefs'
import { DEFAULT_GRID_SIZE_PX } from '@/features/timeline/config/grid'

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
  const clickEnabled = ref(typeof stored.clickEnabled === 'boolean' ? stored.clickEnabled : false)
  const countInEnabled = ref(
    typeof stored.countInEnabled === 'boolean' ? stored.countInEnabled : true,
  )
  const soundDurationScale = ref(
    Number.isFinite(stored.soundDurationScale) && stored.soundDurationScale > 0
      ? stored.soundDurationScale
      : 1,
  )
  const loopEnabled = ref(typeof stored.loopEnabled === 'boolean' ? stored.loopEnabled : false)
  const shuffleEnabled = ref(
    typeof stored.shuffleEnabled === 'boolean' ? stored.shuffleEnabled : false,
  )
  const loopStartBlock = ref(
    Number.isFinite(stored.loopStartBlock) && stored.loopStartBlock >= 0
      ? Number(stored.loopStartBlock)
      : 0,
  )
  const loopEndBlock = ref(
    Number.isFinite(stored.loopEndBlock) && stored.loopEndBlock >= 0
      ? Number(stored.loopEndBlock)
      : 0,
  )
  const beatTop = ref(Number.isFinite(stored.beatTop) ? stored.beatTop : 4)
  const beatBottom = ref([1, 2, 4, 8].includes(stored.beatBottom) ? stored.beatBottom : 4)
  const pickupEnabled = ref(typeof stored.pickupEnabled === 'boolean' ? stored.pickupEnabled : false)
  const pickupBeats = ref(
    Number.isFinite(stored.pickupBeats) && stored.pickupBeats >= 1
      ? Math.floor(stored.pickupBeats)
      : 1,
  )
  const zoomPxPerBlock = ref(
    Number.isFinite(stored.zoomPxPerBlock) && stored.zoomPxPerBlock > 0
      ? stored.zoomPxPerBlock
      : DEFAULT_GRID_SIZE_PX,
  )
  const autoFollowEnabled = ref(
    typeof stored.autoFollowEnabled === 'boolean' ? stored.autoFollowEnabled : true,
  )
  const ghostNotesEnabled = ref(
    typeof stored.ghostNotesEnabled === 'boolean' ? stored.ghostNotesEnabled : false,
  )
  const timelineLengthBlocks = ref(
    Number.isFinite(stored.timelineLengthBlocks) && stored.timelineLengthBlocks > 0
      ? Number(stored.timelineLengthBlocks)
      : 0,
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
  // Always start with no active note modifier (neither dotted nor triplet).
  const simGroupMode = ref('')

  const stringsCollapsed = ref(
    typeof stored.stringsCollapsed === 'boolean' ? stored.stringsCollapsed : false,
  )
  const showChordShapePanel = ref(
    typeof stored.showChordShapePanel === 'boolean' ? stored.showChordShapePanel : false,
  )
  const handPositionVisible = ref(
    typeof stored.handPositionVisible === 'boolean' ? stored.handPositionVisible : false,
  )
  const showSuggestedPosition = ref(
    typeof stored.showSuggestedPosition === 'boolean' ? stored.showSuggestedPosition : false,
  )
  const eraseMode = ref(typeof stored.eraseMode === 'boolean' ? stored.eraseMode : false)

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

  function setClickEnabled(v) {
    clickEnabled.value = Boolean(v)
  }

  function setCountInEnabled(v) {
    countInEnabled.value = Boolean(v)
  }

  function setSoundDurationScale(v) {
    const n = Number(v)
    soundDurationScale.value = Number.isFinite(n) && n > 0 ? Math.min(16, Math.max(0.1, n)) : 1
  }

  function setLoopEnabled(v) {
    loopEnabled.value = Boolean(v)
  }

  function setShuffleEnabled(v) {
    shuffleEnabled.value = Boolean(v)
  }

  function setLoopStartBlock(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return
    loopStartBlock.value = Math.max(0, Number(n.toFixed(4)))
  }

  function setLoopEndBlock(v) {
    const n = Number(v)
    if (!Number.isFinite(n)) return
    loopEndBlock.value = Math.max(0, Number(n.toFixed(4)))
  }

  function setBeatTop(v) {
    const n = Number.parseInt(v, 10)
    beatTop.value = Number.isFinite(n) && n > 0 ? n : 1
    const maxByBeat = Math.max(1, beatTop.value - 1)
    const max = Math.max(1, Math.min(9, maxByBeat))
    if (pickupBeats.value > max) pickupBeats.value = max
  }

  function setBeatBottom(v) {
    const n = Number.parseInt(v, 10)
    beatBottom.value = [1, 2, 4, 8].includes(n) ? n : 4
  }

  function setPickupEnabled(v) {
    pickupEnabled.value = Boolean(v)
  }

  function setPickupBeats(v) {
    const n = Number.parseInt(String(v), 10)
    if (!Number.isFinite(n)) return
    const top = Number.parseInt(String(beatTop.value), 10)
    const maxByBeat = Number.isFinite(top) && top > 1 ? top - 1 : 1
    const max = Math.max(1, Math.min(9, maxByBeat))
    pickupBeats.value = Math.max(1, Math.min(max, n))
  }

  function setZoomPxPerBlock(v) {
    const n = Number(v)
    // Keep sane bounds; UI can still clamp more tightly.
    zoomPxPerBlock.value = Number.isFinite(n) ? Math.min(200, Math.max(8, n)) : DEFAULT_GRID_SIZE_PX
  }

  function setAutoFollowEnabled(v) {
    autoFollowEnabled.value = Boolean(v)
  }

  function setGhostNotesEnabled(v) {
    ghostNotesEnabled.value = Boolean(v)
  }

  function setTimelineLengthBlocks(v) {
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) {
      timelineLengthBlocks.value = 0
      return
    }
    timelineLengthBlocks.value = Math.min(4096, Math.max(1, Number(n.toFixed(3))))
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

  function setShowChordShapePanel(v) {
    showChordShapePanel.value = Boolean(v)
  }

  function setHandPositionVisible(v) {
    handPositionVisible.value = Boolean(v)
  }

  function setShowSuggestedPosition(v) {
    showSuggestedPosition.value = Boolean(v)
  }

  function setSimGroupMode(v) {
    const raw = String(v || '')
    const next = raw === 'dot' ? 'dotted' : raw
    simGroupMode.value = next === 'dotted' || next === '3' ? next : ''
  }

  function setEraseMode(v) {
    eraseMode.value = Boolean(v)
  }

  persistRefs(STORAGE_KEY, {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    soundPreviewEnabled,
    clickEnabled,
    countInEnabled,
    soundDurationScale,
    loopEnabled,
    shuffleEnabled,
    loopStartBlock,
    loopEndBlock,
    beatTop,
    beatBottom,
    pickupEnabled,
    pickupBeats,
    zoomPxPerBlock,
    autoFollowEnabled,
    ghostNotesEnabled,
    timelineLengthBlocks,
    selectedColor,
    activeString,
    activeTool,
    stringsCollapsed,
    showChordShapePanel,
    handPositionVisible,
    showSuggestedPosition,
    simGroupMode,
    eraseMode,
  })

  return {
    selectedMode,
    lastRhythmMode,
    snapEnabled,
    soundPreviewEnabled,
    clickEnabled,
    countInEnabled,
    soundDurationScale,
    loopEnabled,
    shuffleEnabled,
    loopStartBlock,
    loopEndBlock,
    beatTop,
    beatBottom,
    pickupEnabled,
    pickupBeats,
    zoomPxPerBlock,
    autoFollowEnabled,
    ghostNotesEnabled,
    timelineLengthBlocks,
    selectedColor,
    activeString,
    activeTool,
    stringsCollapsed,
    showChordShapePanel,
    handPositionVisible,
    showSuggestedPosition,
    simGroupMode,
    eraseMode,
    setSelectedMode,
    setSnapEnabled,
    setSoundPreviewEnabled,
    setClickEnabled,
    setCountInEnabled,
    setSoundDurationScale,
    setLoopEnabled,
    setShuffleEnabled,
    setLoopStartBlock,
    setLoopEndBlock,
    setBeatTop,
    setBeatBottom,
    setPickupEnabled,
    setPickupBeats,
    setZoomPxPerBlock,
    setAutoFollowEnabled,
    setGhostNotesEnabled,
    setTimelineLengthBlocks,
    setSelectedColor,
    setActiveString,
    setActiveTool,
    setStringsCollapsed,
    setShowChordShapePanel,
    setHandPositionVisible,
    setShowSuggestedPosition,
    setSimGroupMode,
    setEraseMode,
  }
})
