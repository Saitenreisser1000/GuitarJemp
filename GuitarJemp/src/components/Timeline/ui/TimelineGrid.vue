<template>
  <div class="timeline-grid" :style="gridStyle">
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  totalBlocks: { type: Number, required: true },
  beatTop: { type: Number, default: 4 }
})

const beatsPerBar = computed(() => {
  const v = Number.parseInt(props.beatTop, 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const gridStyle = computed(() => {
  return {
    '--total-blocks': String(props.totalBlocks),
    '--beats-per-bar': String(beatsPerBar.value)
  }
})
</script>

<style scoped>
.timeline-grid {
  position: relative;
  width: 100%;
  height: 30px;
  background-color: #f0f0f0;
  border-bottom: 2px solid #ddd;
  display: flex;
  align-items: center;
  --cell: calc(100% / var(--total-blocks));
  --sub: calc(var(--cell) / 4);
  --bar: calc(var(--cell) * var(--beats-per-bar));
  background-image:
    repeating-linear-gradient(to right, rgba(208, 208, 208, 0.35) 0px, rgba(208, 208, 208, 0.35) 1px, transparent 1px, transparent var(--sub)),
    repeating-linear-gradient(to right, rgba(208, 208, 208, 0.9) 0px, rgba(208, 208, 208, 0.9) 2px, transparent 2px, transparent var(--cell)),
    repeating-linear-gradient(to right, rgba(70, 70, 70, 0.45) 0px, rgba(70, 70, 70, 0.45) 4px, transparent 4px, transparent var(--bar));
}
</style>
