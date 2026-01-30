<template>
  <div class="playback-controls">
    <button @click="togglePlay" class="play-btn">
      {{ isPlaying ? '⏸ Stop' : '▶ Abspielen' }}
    </button>
    <input
      v-model.number="tempoLocal"
      type="range"
      min="30"
      max="200"
      class="tempo-slider"
    />
    <span class="tempo-label">Tempo: {{ tempoLocal }} BPM</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true }
})

const emit = defineEmits(['toggle-play', 'update-tempo'])

const tempoLocal = computed({
  get: () => props.tempo,
  set: (v) => emit('update-tempo', v)
})

function togglePlay() {
  emit('toggle-play')
}
</script>

<style scoped>
.playback-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.play-btn {
  padding: 8px 16px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.play-btn:hover {
  background-color: #45a049;
}

.tempo-slider {
  flex: 1;
  max-width: 200px;
  cursor: pointer;
}

.tempo-label {
  color: #666;
  font-size: 14px;
  min-width: 110px;
}
</style>
