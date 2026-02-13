<template>
  <div class="fretboard-container">
    <FretboardControls v-if="showControls" :show-setup="false" :num-frets="props.numFrets"
      @update-frets="(n) => emit('update-frets', n)">
    </FretboardControls>

    <div class="fretboard">
      <FretboardShow :num-frets="props.numFrets" :editable="true" />
    </div>
  </div>
</template>

<script setup>
defineOptions({ name: 'FretboardEdit' })
import FretboardControls from './controls/FretboardControls.vue'
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
