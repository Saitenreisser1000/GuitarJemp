<template>
  <v-card class="pa-3 mb-4" variant="flat" border>
    <div class="d-flex align-center flex-wrap ga-4">
      <div class="text-subtitle-2 text-medium-emphasis">note:</div>

      <v-btn-toggle v-model="modeLocal" mandatory divided>
        <v-btn v-for="label in labels" :key="label" :value="label" variant="tonal">
          {{ label }}
        </v-btn>
      </v-btn-toggle>

      <div class="ms-auto d-flex align-center flex-wrap ga-3">
        <div class="d-flex flex-column ga-2" style="min-width: 220px">
          <div class="text-caption text-medium-emphasis">Zoom</div>
          <v-slider v-model="zoomLocal" density="compact" hide-details min="12" max="120" step="2" />
        </div>

        <div class="d-flex flex-column ga-2">
          <div class="text-caption text-medium-emphasis">Beat</div>
          <div class="d-flex ga-2">
            <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 84px"
              :model-value="beatTop" @update:model-value="updateBeatTop" />

            <v-select density="compact" hide-details style="width: 84px" :items="beatBottomItems"
              :model-value="beatBottom" @update:model-value="updateBeatBottom" />
          </div>
        </div>

        <v-switch density="compact" hide-details inset label="Snap" :model-value="snapEnabled"
          @update:model-value="(v) => emit('update-snap', Boolean(v))" />

        <v-switch density="compact" hide-details inset label="Sound" :model-value="soundPreviewEnabled"
          @update:model-value="(v) => emit('update-sound-preview', Boolean(v))" />
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  zoomPxPerBlock: { type: Number, default: 50 },
})

const emit = defineEmits([
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-beat-top',
  'update-beat-bottom',
  'update-zoom',
])

const labels = ['1/16', '1/8', '1/4', '1/2', '1', 'sim']

const beatBottomItems = [1, 2, 4, 8]

const modeLocal = computed({
  get: () => props.selectedMode,
  set: (v) => emit('update-mode', String(v)),
})

const zoomLocal = computed({
  get: () => props.zoomPxPerBlock,
  set: (v) => emit('update-zoom', Number(v)),
})

function updateBeatTop(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-top', Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
}

function updateBeatBottom(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-bottom', beatBottomItems.includes(parsed) ? parsed : 4)
}
</script>
