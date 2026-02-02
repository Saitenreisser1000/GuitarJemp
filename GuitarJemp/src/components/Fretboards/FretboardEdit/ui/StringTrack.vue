<template>
  <div class="string-track">
    <div class="open-fret">
      <FretPosition
        :is-active="isFretActive(0)"
        :active-color="getFretColor(0)"
        :note-label="noteLabelForFret(0)"
        :is-selected="isFretSelected(0)"
        @toggle="emitToggleNote(0)"
      />
    </div>
    <div class="nut" aria-hidden="true" />
    <div class="string-line">
      <FretPosition
        v-for="fret in numFrets"
        :key="`fret-${fret}-string-${stringNumber}`"
        :is-active="isFretActive(fret)"
        :active-color="getFretColor(fret)"
        :note-label="noteLabelForFret(fret)"
        :is-selected="isFretSelected(fret)"
        @toggle="emitToggleNote(fret)"
      />
    </div>

    <div v-if="showInlayDots" class="inlay-layer" aria-hidden="true">
      <div
        v-for="dot in inlayDots"
        :key="dot.key"
        class="inlay-dot"
        :style="{ left: inlayLeftPx(dot.fret) + 'px' }"
      />
    </div>
  </div>
</template>

<script setup>
import FretPosition from './FretPosition.vue'
import { midiToNoteName } from '@/domain/music/notes'
import { computed } from 'vue'

const props = defineProps({
  /**
   * String/line number (1-6 typically)
   */
  stringNumber: {
    type: Number,
    required: true
  },
  /**
   * Total number of frets to display
   */
  numFrets: {
    type: Number,
    required: true
  },
  numStrings: {
    type: Number,
    default: null
  },
  /**
   * Array of active note objects
   */
  activeNotes: {
    type: Array,
    default: () => []
  },
  selectedFret: {
    type: Number,
    default: null
  },
  selectedString: {
    type: Number,
    default: null
  },
  openMidi: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['toggle-note'])

const singleInlayFrets = computed(() => {
  const frets = [3, 5, 7, 9, 15, 17, 19]
  const max = Number(props.numFrets) || 0
  return frets.filter((f) => f <= max)
})

const hasFret12 = computed(() => (Number(props.numFrets) || 0) >= 12)

const inlayDots = computed(() => {
  const dots = []

  // Single-dot frets: centered between 3rd and 4th string.
  if (props.stringNumber === 3) {
    for (const f of singleInlayFrets.value) dots.push({ fret: f, key: `single-${f}` })
  }

  // Double-dot fret 12: one dot between 2/3, one dot between 4/5.
  if (hasFret12.value) {
    const n = Number(props.numStrings)
    const canShow23 = !Number.isFinite(n) || n >= 3
    const canShow45 = !Number.isFinite(n) || n >= 5

    if (props.stringNumber === 2 && canShow23) dots.push({ fret: 12, key: 'double12-top' })
    if (props.stringNumber === 4 && canShow45) dots.push({ fret: 12, key: 'double12-bottom' })
  }

  return dots
})

const showInlayDots = computed(() => inlayDots.value.length > 0)

function inlayLeftPx(fret) {
  // Keep in sync with CSS widths.
  const openWidth = 40
  const nutWidth = 15
  const fretWidth = 80
  const gap = 5
  const f = Number(fret)
  if (!Number.isFinite(f) || f < 1) return openWidth + nutWidth
  return openWidth + nutWidth + (f - 1) * (fretWidth + gap) + fretWidth / 2
}

/**
 * Check if a fret is currently active
 */
function isFretActive(fret) {
  return props.activeNotes.some((n) => n?.fret === fret && n?.string === props.stringNumber)
}

function getFretColor(fret) {
  // Multiple notes can exist on the same fret/string; use the most recently placed one.
  const candidates = props.activeNotes
    .filter((n) => n?.fret === fret && n?.string === props.stringNumber)
    .sort((a, b) => (Number(b?.placedAtMs) || 0) - (Number(a?.placedAtMs) || 0))

  return candidates[0]?.color ?? '#d32f2f'
}

function isFretSelected(fret) {
  return props.selectedString === props.stringNumber && props.selectedFret === fret
}

/**
 * Emit note toggle event to parent
 */
function emitToggleNote(fret) {
  emit('toggle-note', `${fret}-${props.stringNumber}`)
}

function noteLabelForFret(fret) {
  if (!Number.isFinite(Number(props.openMidi))) return ''
  const midi = Number(props.openMidi) + Number(fret)
  return midiToNoteName(midi, { includeOctave: true })
}
</script>

<style scoped>
.string-track {
  display: flex;
  gap: 0;
  align-items: center;
  margin: 0;
  position: relative;
}

.open-fret {
  flex: 0 0 auto;
}

.open-fret :deep(.fret-position) {
  width: 40px;
}

.nut {
  width: 15px;
  height: 40px;
  background: rgba(30, 30, 30, 0.85);
}

.string-line {
  display: flex;
  gap: 5px;
  background: #000;
}

.inlay-layer {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.inlay-dot {
  z-index: 1;
  position: absolute;
  top: 100%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: rgba(40, 40, 40, 0.7);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}
</style>
