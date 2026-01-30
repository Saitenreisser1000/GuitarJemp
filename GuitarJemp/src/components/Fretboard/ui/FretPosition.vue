<template>
  <div class="fret-position" :class="{ active: isActive }" @click="$emit('toggle')">
    <div class="dot"></div>
  </div>
</template>

<script setup>
defineOptions({ name: 'FretPosition' })

/**
 * Whether this fret position is currently active/selected
 * @type {Boolean}
 */
defineProps({
  isActive: {
    type: Boolean,
    required: true
  }
})

defineEmits(['toggle'])
</script>

<style scoped>
.fret-position {
  width: 80px;
  height: 40px;
  border: 1px solid #999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.fret-position.active {
  background: #d32f2f;
}

.fret-position:hover {
  border-color: #667eea;
}

.fret-position .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #999;
  opacity: 0;
}

.fret-position.active .dot {
  background: white;
  opacity: 1;
}
</style>
