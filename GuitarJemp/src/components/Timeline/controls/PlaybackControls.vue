<template>
  <v-card class="transport-controls ui-panel pa-3" variant="flat" tabindex="0" @keydown.tab.prevent="onTapTempo">
    <div class="d-flex align-center ga-4 flex-wrap">
      <div class="d-flex align-center ga-2">
        <v-btn color="primary" variant="flat" icon :title="isPlaying ? 'Pause' : 'Play'"
          :aria-label="isPlaying ? 'Pause' : 'Play'" @click="togglePlayPause">
          <v-icon :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" />
        </v-btn>

        <v-btn color="primary" variant="flat" icon title="Von vorne" aria-label="Von vorne" @click="seekStart">
          <v-icon icon="mdi-skip-backward" />
        </v-btn>

        <v-switch class="loop-switch" density="compact" hide-details inset label="Loop" :model-value="loopEnabled"
          @update:model-value="(v) => emit('update-loop', Boolean(v))" />
      </div>

      <v-slider v-model="playheadLocal" class="transport-slider flex-grow-1" :min="0"
        :max="Math.max(0, Number(totalDuration) || 0)" :step="PLAYHEAD_STEP_MS" hide-details />

      <div class="d-flex align-center ga-2">
        <v-btn
          class="click-btn"
          size="small"
          :variant="clickEnabled ? 'flat' : 'tonal'"
          :color="clickEnabled ? 'primary' : undefined"
          :title="clickEnabled ? 'Click ausschalten' : 'Click einschalten'"
          @click="emit('update-click', !clickEnabled)"
        >
          Click
        </v-btn>
        <v-btn class="tap-btn" size="small" variant="tonal" title="TAB zum Eintappen der BPM" @click="onTapTempo">
          TAB
        </v-btn>
        <v-text-field class="tempo-input" density="compact" hide-details variant="outlined" type="number" :min="TEMPO_MIN"
          :max="TEMPO_MAX" step="1" suffix="BPM" :model-value="String(tempoLocal)" @update:model-value="onTempoInput" />
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue'

const TEMPO_MIN = 30
const TEMPO_MAX = 200
const PLAYHEAD_STEP_MS = 10

const props = defineProps({
  isPlaying: { type: Boolean, required: true },
  tempo: { type: Number, required: true },
  clickEnabled: { type: Boolean, default: false },
  loopEnabled: { type: Boolean, default: false },
  playhead: { type: Number, required: true },
  totalDuration: { type: Number, required: true },
})

const emit = defineEmits([
  'toggle-play',
  'seek-start',
  'seek-playhead',
  'update-tempo',
  'update-click',
  'update-loop',
])

const tapTimesMs = ref([])

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

function onTapTempo() {
  const now = performance.now()
  const MAX_GAP_MS = 2500
  const taps = tapTimesMs.value
  const prev = taps.length ? taps[taps.length - 1] : null
  if (prev == null || now - prev > MAX_GAP_MS) {
    tapTimesMs.value = [now]
    return
  }

  taps.push(now)
  if (taps.length > 6) taps.shift()

  if (taps.length < 2) return
  const intervals = []
  for (let i = 1; i < taps.length; i += 1) {
    const dt = taps[i] - taps[i - 1]
    if (dt >= 200 && dt <= 2000) intervals.push(dt)
  }
  if (!intervals.length) return

  const avgMs = intervals.reduce((sum, v) => sum + v, 0) / intervals.length
  const bpm = clampTempo(60000 / avgMs)
  emit('update-tempo', bpm)
}
</script>

<style scoped>
.tempo-input {
  width: 110px;
  min-width: 110px;
}

.click-btn {
  min-width: 68px;
}

.tap-btn {
  min-width: 56px;
}

.transport-slider {
  min-width: 420px;
}

.transport-controls {
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  border: 1px solid var(--color-border);
}

.loop-switch {
  color: var(--color-text-muted);
}

.transport-controls :deep(.v-slider-track__background) {
  opacity: 1;
  background: color-mix(in srgb, var(--color-primary) 22%, var(--color-surface-2));
}

.transport-controls :deep(.v-slider-track__fill) {
  background: var(--color-primary);
}

.transport-controls :deep(.v-slider-thumb__surface) {
  border: 2px solid color-mix(in srgb, var(--color-primary) 72%, var(--color-surface));
  box-shadow: 0 2px 8px rgb(0 0 0 / 24%);
}

.transport-controls :deep(.v-field) {
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%);
}

@media (max-width: 860px) {
  .transport-slider {
    min-width: 220px;
    width: 100%;
  }
}
</style>
