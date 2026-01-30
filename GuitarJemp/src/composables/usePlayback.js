import { ref } from 'vue'

export function usePlayback({ onTick } = {}) {
  const isPlaying = ref(false)
  const playhead = ref(0) // milliseconds
  let rafId = null
  let startTs = 0
  let baseTime = 0

  function start(totalDuration, tempo = 120) {
    if (isPlaying.value) return
    isPlaying.value = true
    startTs = performance.now()
    baseTime = 0

    const animate = (ts) => {
      const elapsed = (ts - startTs) * (tempo / 120) + baseTime
      playhead.value = elapsed
      if (onTick) onTick(elapsed)
      if (elapsed >= totalDuration) {
        stop()
      } else {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
  }

  function pause() {
    if (!isPlaying.value) return
    isPlaying.value = false
    baseTime = playhead.value
    if (rafId) cancelAnimationFrame(rafId)
  }

  function stop() {
    isPlaying.value = false
    playhead.value = 0
    baseTime = 0
    if (rafId) cancelAnimationFrame(rafId)
  }

  return { isPlaying, playhead, start, pause, stop }
}
