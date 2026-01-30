<template>
  <div
    class="playhead-indicator"
    :style="{ left: playheadPercent + '%' }"
  />
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  playhead: { type: Number, required: true },
  totalDuration: { type: Number, required: true }
})

const playheadPercent = computed(() => (props.playhead / props.totalDuration) * 100)
</script>

<style scoped>
.playhead-indicator {
  position: absolute;
  width: 3px;
  height: 100%;
  background-color: #d32f2f;
  z-index: 10;
  transform: translateX(-50%);
  pointer-events: none;
}
</style>
