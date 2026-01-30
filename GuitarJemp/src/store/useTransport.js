import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'guitarjemp.transport.v1'

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

export const useTransportStore = defineStore('transport', () => {
  const stored = readStorage() ?? {}

  const tempo = ref(Number.isFinite(stored.tempo) ? stored.tempo : 120)
  const playState = ref(stored.playState === 'playing' ? 'playing' : 'stopped')

  function setTempo(t) {
    const n = Number(t)
    tempo.value = Number.isFinite(n) ? n : 120
  }

  function setPlayState(s) {
    playState.value = s === 'playing' ? 'playing' : 'stopped'
  }

  watch([tempo, playState], () => {
    writeStorage({ tempo: tempo.value, playState: playState.value })
  })

  return { tempo, playState, setTempo, setPlayState }
})
