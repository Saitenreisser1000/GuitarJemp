<template>
  <div class="timeline-top-row">
    <div v-if="transportVisible || timelineVisible" class="timeline-options-btn-wrap">
      <div v-if="timelineVisible" class="timeline-top-zoom d-flex align-center ga-1">
        <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom -'" @click="emit('zoom-left')">
          &lt;
        </v-btn>
        <div class="text-caption zoom-value">zoom</div>
        <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom +'" @click="emit('zoom-right')">
          &gt;
        </v-btn>
      </div>

      <v-menu location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="timeline-options-btn"
            :title="t('modeSelector.options')">
            <v-icon icon="mdi-cog-outline" size="16" />
          </v-btn>
        </template>

        <v-card class="pa-3 d-flex flex-column ga-2" min-width="220" variant="flat" border>
          <div class="text-caption zoom-label">{{ t('modeSelector.beat') }}</div>
          <div class="d-flex ga-2">
            <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 84px"
              :model-value="beatTop" @update:model-value="updateBeatTopFromOptions" />
            <v-select density="compact" hide-details style="width: 84px" :items="beatBottomItems"
              :model-value="beatBottom" @update:model-value="updateBeatBottomFromOptions" />
          </div>
          <div class="d-flex align-center ga-2">
            <v-switch density="compact" hide-details inset :label="t('modeSelector.pickup')"
              :model-value="pickupEnabled" @update:model-value="(v) => emit('update-pickup-enabled', Boolean(v))" />
            <v-text-field density="compact" hide-details type="number" min="1" :max="pickupMax" step="1"
              style="width: 84px" :label="t('modeSelector.beats')" :disabled="!pickupEnabled"
              :model-value="pickupBeats" @update:model-value="updatePickupBeatsFromOptions" />
          </div>
          <v-switch density="compact" hide-details inset :label="t('modeSelector.snap')"
            :model-value="snapEnabled" @update:model-value="(v) => emit('update-snap', Boolean(v))" />
          <v-switch density="compact" hide-details inset :label="t('modeSelector.collapseStrings')"
            :model-value="stringsCollapsed" @update:model-value="(v) => emit('update-strings-collapsed', Boolean(v))" />
        </v-card>
      </v-menu>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '@/i18n'

defineOptions({ name: 'TimelineTopRow' })

const props = defineProps({
  timelineVisible: { type: Boolean, default: true },
  transportVisible: { type: Boolean, default: true },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 1 },
  snapEnabled: { type: Boolean, default: true },
  stringsCollapsed: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'update-snap',
  'update-strings-collapsed',
  'zoom-left',
  'zoom-right',
])

const { t } = useI18n()

const beatBottomItems = [1, 2, 4, 8]
const pickupMax = computed(() => {
  const top = Number.parseInt(String(props.beatTop), 10)
  const maxByBeat = Number.isFinite(top) && top > 1 ? top - 1 : 1
  return Math.max(1, Math.min(9, maxByBeat))
})

function updateBeatTopFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-top', Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
}

function updateBeatBottomFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-bottom', beatBottomItems.includes(parsed) ? parsed : 4)
}

function updatePickupBeatsFromOptions(v) {
  const parsed = Number.parseInt(String(v), 10)
  if (!Number.isFinite(parsed)) return
  const next = Math.max(1, Math.min(pickupMax.value, parsed))
  emit('update-pickup-beats', next)
}
</script>

<style scoped>
.timeline-options-btn-wrap {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-top-zoom {
  margin-right: 2px;
}

.timeline-top-row {
  width: 100%;
  min-height: 28px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.timeline-options-btn {
  min-width: 26px;
  padding-inline: 0;
}

.zoom-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.zoom-value {
  min-width: 28px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.zoom-adjust-btn {
  min-width: 22px;
  height: 22px;
  padding: 0;
}

@media (max-width: 860px) {
  .zoom-value {
    min-width: 24px;
  }
}
</style>
