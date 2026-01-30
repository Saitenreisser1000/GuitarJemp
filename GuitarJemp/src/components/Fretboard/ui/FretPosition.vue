<template>
  <div
    class="fret-position"
    :class="{ active: isActive, selected: isSelected }"
    :style="styleObj"
    @click="$emit('toggle')"
  >
    <span class="note-label">{{ noteLabel }}</span>
    <div class="dot" aria-hidden="true"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
defineOptions({ name: 'FretPosition' })

/**
 * Whether this fret position is currently active/selected
 * @type {Boolean}
 */
const props = defineProps({
  isActive: {
    type: Boolean,
    required: true
  },
  activeColor: {
    type: String,
    default: '#d32f2f'
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  noteLabel: {
    type: String,
    default: ''
  }
})

defineEmits(['toggle'])

const styleObj = computed(() => {
  if (!props.isActive) return {}
  return { backgroundColor: props.activeColor }
})
</script>

<style scoped>
.fret-position {
  width: 80px;
  height: 40px;
  /*border: 1px solid #999;*/
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  /*border-radius: 3px;*/
  cursor: pointer;
  transition: all 0.2s ease;
}

.fret-position::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background: rgba(40, 40, 40, 0.35);
  pointer-events: none;
}

.fret-position.active::before {
  background: rgba(255, 255, 255, 0.65);
}

.fret-position.active {
  background: #d32f2f;
}

.fret-position.selected {
  border-color: rgba(20, 20, 20, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
}

.fret-position:hover {
  border-color: #667eea;
}

.fret-position .dot {
  position: relative;
  z-index: 1;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #999;
  opacity: 0;
}

.fret-position .note-label {
  position: relative;
  z-index: 1;
  font-size: 12px;
  font-weight: 600;
  color: rgba(20, 20, 20, 0.8);
  user-select: none;
}

.fret-position.active .note-label {
  color: rgba(255, 255, 255, 0.95);
}

.fret-position.active .dot {
  background: white;
  opacity: 1;
}
</style>
