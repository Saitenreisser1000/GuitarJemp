<template>
  <div class="fretboard-container">
    <div class="fretboard">
      <FretboardShow :num-frets="props.numFrets" :editable="true" @update-frets="(n) => emit('update-frets', n)" />
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'FretboardEdit' })
import FretboardShow from '../FretboardShow/FretboardShow.vue'

const props = defineProps({
  numFrets: { type: Number, required: true },
  showControls: { type: Boolean, default: true },
})

const emit = defineEmits(['update-frets'])
</script>

<style scoped>
.fretboard-container {
  padding: 8px;
}

.fretboard {
  flex: 1;
  margin-top: 4px;
  max-width: 100%;
}
</style>
