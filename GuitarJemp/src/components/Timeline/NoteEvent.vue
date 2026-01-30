<template>
  <div
    class="note-event"
    :style="{ left: leftPercent + '%', width: widthPercent + '%', backgroundColor: color }"
    :title="title"
  >
    <span class="fret-number">{{ note.fret }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  note: Object,
  totalBlocks: { type: Number, default: 16 },
  color: String,
  snapEnabled: Boolean,
  step: Number
})

const leftPercent = computed(() => {
  const gridIndex = Number(props.note?.gridIndex ?? 1)
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  // left edge of the cell: raster 1 => 0%
  return ((gridIndex - 1) / total) * 100
})

const widthPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  return 100 / total
})

const title = computed(() => `Bund ${props.note?.fret}, Raster ${props.note?.gridIndex}`)
</script>

<style scoped>
.note-event { position:absolute; height:40px; top:10px; border-radius:4px; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold }
</style>
