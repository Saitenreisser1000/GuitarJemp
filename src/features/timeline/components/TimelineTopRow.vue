<template>
  <div class="timeline-top-row" :class="{ 'is-sidebar': sidebar }">
    <div v-if="transportVisible || timelineVisible" class="timeline-options-btn-wrap" :class="{ 'is-sidebar': sidebar }">
      <div v-if="timelineVisible && !sidebar" class="timeline-top-zoom d-flex align-center ga-1">
        <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom -'" @click="emit('zoom-left')">
          &lt;
        </v-btn>
        <div class="text-caption zoom-value">zoom</div>
        <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom +'" @click="emit('zoom-right')">
          &gt;
        </v-btn>
      </div>

      <div v-if="sidebar" class="timeline-options-sidebar" :style="optionsMenuStyle">
        <section class="timeline-sidebar-section">
          <div class="timeline-sidebar-title">Setup</div>

          <div class="timeline-zoom-toolbar">
            <span class="timeline-sidebar-caption">Zoom</span>
            <div class="timeline-top-zoom d-flex align-center ga-1">
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom -'" @click="emit('zoom-left')">
                &lt;
              </v-btn>
              <div class="text-caption zoom-value">zoom</div>
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :title="'Zoom +'" @click="emit('zoom-right')">
                &gt;
              </v-btn>
            </div>
          </div>

          <div class="timeline-meter-chip">
            <span class="timeline-sidebar-caption">{{ t('modeSelector.beat') }}</span>
            <div class="timeline-meter-inputs">
              <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 72px"
                :model-value="beatTop" @update:model-value="updateBeatTopFromOptions" />
              <v-select density="compact" hide-details style="width: 72px" :items="beatBottomItems"
                :model-value="beatBottom" @update:model-value="updateBeatBottomFromOptions" />
            </div>
          </div>

          <div class="timeline-toggle-grid">
            <button class="timeline-toggle-chip" :class="{ 'is-active': pickupEnabled }" type="button"
              @click="emit('update-pickup-enabled', !pickupEnabled)">
              <span class="timeline-toggle-label">Pickup</span>
              <span class="timeline-toggle-value">{{ pickupEnabled ? `${pickupBeats} Beat${pickupBeats === 1 ? '' : 's'}` : 'Off' }}</span>
            </button>

            <button class="timeline-toggle-chip" :class="{ 'is-active': snapEnabled }" type="button"
              @click="emit('update-snap', !snapEnabled)">
              <span class="timeline-toggle-label">Snap</span>
              <span class="timeline-toggle-value">{{ snapEnabled ? 'On' : 'Off' }}</span>
            </button>

            <button class="timeline-toggle-chip" :class="{ 'is-active': stringsCollapsed }" type="button"
              @click="emit('update-strings-collapsed', !stringsCollapsed)">
              <span class="timeline-toggle-label">Strings</span>
              <span class="timeline-toggle-value">{{ stringsCollapsed ? 'Collapsed' : 'Open' }}</span>
            </button>
          </div>

          <div class="timeline-pickup-stepper">
            <span class="timeline-sidebar-caption">Pickup beats</span>
            <div class="timeline-pickup-controls">
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :disabled="!pickupEnabled" :title="'Pickup -1'"
                @click="stepPickupBeats(-1)">
                -
              </v-btn>
              <v-text-field density="compact" hide-details type="number" min="1" :max="pickupMax" step="1"
                style="width: 72px" :disabled="!pickupEnabled"
                :model-value="pickupBeats" @update:model-value="updatePickupBeatsFromOptions" />
              <v-btn size="x-small" variant="tonal" class="zoom-adjust-btn" :disabled="!pickupEnabled" :title="'Pickup +1'"
                @click="stepPickupBeats(1)">
                +
              </v-btn>
            </div>
          </div>
        </section>
      </div>

      <v-menu v-else location="bottom end" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="x-small" variant="tonal" class="timeline-options-btn"
            :title="t('modeSelector.options')">
            <v-icon icon="mdi-cog-outline" size="16" />
          </v-btn>
        </template>

        <div class="timeline-options-menu pa-3 d-flex flex-column ga-2" :style="optionsMenuStyle">
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
        </div>
      </v-menu>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
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
  sidebar: { type: Boolean, default: false },
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

const beatBottomItems = TIMELINE_LAYOUT.topRow.beatBottomItems
const optionsMenuStyle = computed(() => ({
  '--timeline-options-menu-min-w': `${TIMELINE_LAYOUT.topRow.optionsMenuMinWidthPx}px`,
}))
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

function stepPickupBeats(delta) {
  const current = Number.parseInt(String(props.pickupBeats), 10)
  const safeCurrent = Number.isFinite(current) ? current : 1
  const next = Math.max(1, Math.min(pickupMax.value, safeCurrent + Number(delta || 0)))
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

.timeline-options-btn-wrap.is-sidebar {
  width: 100%;
  margin-left: 0;
  align-items: stretch;
  flex-direction: column;
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

.timeline-top-row.is-sidebar {
  min-height: 0;
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

.timeline-options-menu {
  min-width: var(--timeline-options-menu-min-w, 220px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-surface) 96%, var(--color-surface-2) 4%);
}

.timeline-options-sidebar {
  width: 100%;
  min-width: 0;
}

.timeline-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border: 1px solid color-mix(in srgb, var(--color-border) 86%, transparent);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
}

.timeline-sidebar-title {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 800;
}

.timeline-sidebar-caption {
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-muted);
  font-weight: 700;
}

.timeline-zoom-toolbar,
.timeline-pickup-stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.timeline-meter-chip {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%);
}

.timeline-meter-inputs,
.timeline-pickup-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.timeline-toggle-grid {
  display: grid;
  gap: 8px;
}

.timeline-toggle-chip {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 38px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-surface) 88%, var(--color-surface-2) 12%);
  color: var(--color-text);
  padding: 0 12px;
  text-align: left;
}

.timeline-toggle-chip.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface) 90%);
}

.timeline-toggle-label {
  font-size: 12px;
  font-weight: 700;
}

.timeline-toggle-value {
  font-size: 11px;
  color: var(--color-text-muted);
  font-weight: 700;
}

@media (max-width: 860px) {
  .zoom-value {
    min-width: 24px;
  }
}
</style>
