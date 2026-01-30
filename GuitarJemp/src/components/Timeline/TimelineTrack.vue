<template>
  <div class="string-line">
    <div class="string-label">Saite {{ string }}</div>
    <div class="timeline-track">
      <div class="grid-background" :style="gridBackgroundStyle"></div>
      <div class="playhead-indicator" :style="{ left: playheadPercent + '%' }" />
      <NoteEvent
        v-for="(note, idx) in notes"
        :key="note.key ?? `note-${note.fret}-${note.gridIndex}-${idx}`"
        :note="note"
        :total-blocks="totalBlocks"
        :color="note.color ?? getNoteColor(note.fret)"
        :snapEnabled="props.snapEnabled"
        :step="props.step"
        @update-grid-index="(key, gridIndex) => emit('update-note-grid-index', key, gridIndex)"
        @update-length="(key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)"
      />
    </div>
  </div>
</template>

<script setup>
import NoteEvent from './NoteEvent.vue'
import { computed } from 'vue'

const props = defineProps({
  string: Number,
  notes: Array,
  totalDuration: Number,
  totalBlocks: { type: Number, default: 16 },
  playhead: Number,
  snapEnabled: Boolean,
  step: Number,
  beatTop: { type: Number, default: 4 }
})

const emit = defineEmits(['update-note-grid-index', 'update-note-length'])

const playheadPercent = computed(() => (props.playhead / props.totalDuration) * 100)

const beatsPerBar = computed(() => {
  const v = Number.parseInt(props.beatTop, 10)
  return Number.isFinite(v) && v > 0 ? v : 1
})

const gridBackgroundStyle = computed(() => {
  return {
    '--total-blocks': String(props.totalBlocks),
    '--beats-per-bar': String(beatsPerBar.value)
  }
})

function getNoteColor(fret) {
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#FFA07A','#98D8C8','#F7DC6F']
  return colors[fret % colors.length]
}

</script>

<style scoped>
.string-line { display:flex; border-bottom:1px solid #eee }
.string-label { width:80px; padding:10px; font-weight:bold; color:#666; background:#f0f0f0; border-right:1px solid #ddd }
.timeline-track { position:relative; flex:1; height:60px }
.grid-background {
  position:absolute;
  width:100%;
  height:100%;
  pointer-events:none;
  --cell: calc(100% / var(--total-blocks));
  --sub: calc(var(--cell) / 4);
  --bar: calc(var(--cell) * var(--beats-per-bar));
  background-image:
    repeating-linear-gradient(to right, rgba(208, 208, 208, 0.35) 0px, rgba(208, 208, 208, 0.35) 1px, transparent 1px, transparent var(--sub)),
    repeating-linear-gradient(to right, #d0d0d0 0px, #d0d0d0 2px, transparent 2px, transparent var(--cell)),
    repeating-linear-gradient(to right, rgba(70, 70, 70, 0.45) 0px, rgba(70, 70, 70, 0.45) 4px, transparent 4px, transparent var(--bar));
}
.playhead-indicator { position:absolute; width:3px; height:100%; background:rgba(211,47,47,0.3); transform:translateX(-50%); z-index:5 }
</style>
