<template>
  <v-card class="pa-3" variant="flat" border>
    <div class="d-flex align-center ga-4 flex-wrap">
      <div class="d-flex align-center ga-2">
        <v-btn color="primary" variant="flat" icon :title="isPlaying ? 'Pause' : 'Play'"
          :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlayPause">
          <v-icon :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" />
        </v-btn>

        <v-btn color="primary" variant="flat" icon title="Von vorne" aria-label="Von vorne" @click="seekStart">
          <v-icon icon="mdi-skip-backward" />
        </v-btn>

        <v-switch density="compact" hide-details inset label="Loop" :model-value="loopEnabled"
          @update:model-value="(v) => emit('update-loop', Boolean(v))" />
      </div>

      <v-slider v-model="playheadLocal" class="transport-slider flex-grow-1" :min="0"
        :max="Math.max(0, Number(totalDuration) || 0)" :step="PLAYHEAD_STEP_MS" hide-details />

      <v-text-field class="tempo-input" density="compact" hide-details variant="outlined" type="number" :min="TEMPO_MIN"
        :max="TEMPO_MAX" step="1" suffix="BPM" :model-value="String(tempoLocal)" @update:model-value="onTempoInput" />
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const TEMPO_MIN = 30
const TEMPO_MAX = 200
const PLAYHEAD_STEP_MS = 10

const props = defineProps({
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true },
  loopEnabled: { type: Boolean, default: false },
  playhead: { type: Number, required: true },
  totalDuration: { type: Number, required: true },
})

const emit = defineEmits([
  'toggle-play',
  'seek-start',
  'seek-playhead',
  'update-tempo',
  'update-loop',
])

const tempoLocal = computed({
  get: () => props.tempo,
  set: (v) => {
    const next = clampTempo(v)
    emit('update-tempo', next)
  },
})

function clampTempo(v) {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v)
  if (!Number.isFinite(n)) return TEMPO_MIN
  return Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(n)))
}

function clampPlayheadMs(v) {
  const total = Math.max(0, Number(props.totalDuration) || 0)
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.min(total, Math.max(0, n))
}

const playheadLocal = computed({
  get: () => clampPlayheadMs(props.playhead),
  set: (v) => emit('seek-playhead', clampPlayheadMs(v)),
})

function onTempoInput(v) {
  tempoLocal.value = v
}

function togglePlayPause() {
  emit('toggle-play')
}

function seekStart() {
  emit('seek-start')
}
</script>

<style scoped>
.tempo-input {
  width: 110px;
  min-width: 110px;
}

.transport-slider {
  min-width: 420px;
}
</style>
