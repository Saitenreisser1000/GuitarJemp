<template>
  <div class="string-track">
    <div class="string-label">{{ stringNumber }}</div>
    <div class="string-line">
      <FretPosition
        v-for="fret in numFrets"
        :key="`fret-${fret}-string-${stringNumber}`"
        :is-active="isFretActive(fret)"
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
