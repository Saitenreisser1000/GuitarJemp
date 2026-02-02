import { ref } from 'vue'

export function usePlayback({ onTick } = {}) {
  const isPlaying = ref(false)
  const playhead = ref(0) // milliseconds
  const loopEnabled = ref(false)
  let rafId = null
  let startTs = 0
  let baseTime = 0

  function start(totalDuration, tempo = 120) {
    if (isPlaying.value) return
    isPlaying.value = true
    startTs = performance.now()
    // Start from the current playhead position (supports pause/seek).
    baseTime = playhead.value

    const duration = Math.max(0, Number(totalDuration) || 0)

    const animate = (ts) => {
      const rawElapsed = (ts - startTs) * (tempo / 120) + baseTime

      if (loopEnabled.value && duration > 0) {
        const wrapped = rawElapsed % duration
        // Keep internal values small/stable across many loops.
        if (rawElapsed >= duration) {
          baseTime = wrapped
          startTs = ts
        }
        playhead.value = wrapped
        if (onTick) onTick(wrapped)
        rafId = requestAnimationFrame(animate)
        return
      }

      const elapsed = rawElapsed
      playhead.value = elapsed
      if (onTick) onTick(elapsed)
      if (elapsed >= duration) stop()
      else rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
  }

  function setLoop(v) {
    loopEnabled.value = Boolean(v)
  }

  function seek(tMs) {
    const t = Math.max(0, Number(tMs) || 0)
    playhead.value = t
    baseTime = t
    startTs = performance.now()
    if (onTick) onTick(t)
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

  return { isPlaying, playhead, loopEnabled, setLoop, start, pause, stop, seek }
}
