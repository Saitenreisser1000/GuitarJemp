import { ref } from 'vue'

export function useGrid({ gridSize = 50, timePerBlock = 500 } = {}) {
  const grid = ref({ gridSize, timePerBlock })

  function snapTimeToGrid(time) {
    return Math.round(time / grid.value.timePerBlock) * grid.value.timePerBlock
  }

  function pxToTime(px, trackWidth, totalDuration) {
    const percent = px / trackWidth
    return percent * totalDuration
  }

  function timeToPx(time, trackWidth, totalDuration) {
    const percent = time / totalDuration
    return percent * trackWidth
  }

  function pxToGridIndex(px, trackWidth) {
    const blockPx = grid.value.gridSize
    // return fractional index (e.g., 0.5 means half a block)
    return px / blockPx
  }

  function quantizeIndex(index, step = 1) {
    // step can be fractional (e.g., 0.5, 0.25)
    return Math.round(index / step) * step
  }

  function gridIndexToTime(index) {
    return index * grid.value.timePerBlock
  }

  return {
    grid,
    snapTimeToGrid,
    pxToTime,
    timeToPx,
    pxToGridIndex,
    quantizeIndex,
    gridIndexToTime
  }
}
