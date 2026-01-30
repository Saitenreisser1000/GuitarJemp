<template>
  <div class="string-track">
    <div class="string-label">{{ stringNumber }}</div>
    <div class="string-line">
      <FretPosition
        v-for="fret in numFrets"
        :key="`fret-${fret}-string-${stringNumber}`"
        :is-active="isFretActive(fret)"
        :active-color="getFretColor(fret)"
        :is-selected="isFretSelected(fret)"
        @toggle="emitToggleNote(fret)"
      />
    </div>
  </div>
</template>

<script setup>
import FretPosition from './FretPosition.vue'

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
  }
})

const emit = defineEmits(['toggle-note'])

/**
 * Check if a fret is currently active
 */
function isFretActive(fret) {
  return props.activeNotes.some(
    (n) => n?.fret === fret && n?.string === props.stringNumber
  )
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
</script>

<style scoped>
.string-track {
  display: flex;
  gap: 5px;
  align-items: center;
}

.string-label {
  width: 40px;
  text-align: center;
  font-weight: bold;
  color: #666;
  background: #f0f0f0;
  border-right: 1px solid #ddd;
  padding: 5px 0;
}

.string-line {
  display: flex;
  gap: 5px;
}
</style>
