import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'guitarjemp.instrument.v1'

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

export const useInstrumentStore = defineStore('instrument', () => {
  const stored = readStorage() ?? {}
  const numStrings = ref(Number.isFinite(stored.numStrings) ? stored.numStrings : 6)
  const instrumentType = ref(
    stored.instrumentType === 'bass' || stored.instrumentType === 'ukulele' ? stored.instrumentType : 'guitar'
  )

  function stringsForInstrument(type) {
    switch (type) {
      case 'bass':
        return 4
      case 'ukulele':
        return 4
      case 'guitar':
      default:
        return 6
    }
  }

  function setNumStrings(n) {
    const v = Number.parseInt(n, 10)
    numStrings.value = Number.isFinite(v) && v > 0 ? v : 6
  }

  function setInstrumentType(type) {
    const t = type === 'bass' || type === 'ukulele' ? type : 'guitar'
    instrumentType.value = t
    numStrings.value = stringsForInstrument(t)
  }

  watch([numStrings, instrumentType], () => writeStorage({
    numStrings: numStrings.value,
    instrumentType: instrumentType.value
  }))

  return { numStrings, instrumentType, setNumStrings, setInstrumentType }
})
