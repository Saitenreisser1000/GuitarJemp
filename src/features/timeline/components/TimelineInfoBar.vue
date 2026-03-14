<template>
  <div class="timeline-info ui-panel">
    <div class="timeline-info-shell">
      <section class="timeline-group timeline-group-tools" :aria-label="t('timelineView.tools')">
        <div class="timeline-group-label">Tool</div>
        <div class="timeline-group-row">
          <label class="timeline-tool timeline-tool-wide" :class="{ 'is-active': String(activeTool) === 'arrow' }"
            :title="t('timelineView.arrow')">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="arrow"
              :checked="String(activeTool) === 'arrow'" @change="emit('update-active-tool', 'arrow')" />
            <span class="timeline-tool-icon" aria-hidden="true">➤</span>
            <span class="timeline-tool-label">Move</span>
          </label>

          <label class="timeline-tool timeline-tool-wide" :class="{ 'is-active': String(activeTool) === 'select' }"
            :title="t('timelineView.selectionRect')">
            <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="select"
              :checked="String(activeTool) === 'select'" @change="emit('update-active-tool', 'select')" />
            <span class="timeline-tool-icon" aria-hidden="true">▭</span>
            <span class="timeline-tool-label">Select</span>
          </label>
        </div>
      </section>

      <section class="timeline-group" aria-label="Edit actions">
        <div class="timeline-group-label">Edit</div>
        <div class="timeline-group-row">
          <button class="timeline-tool timeline-tool-wide" type="button" :title="t('timelineView.copy')"
            @click="emit('copy-selection')">
            <span class="timeline-tool-icon" aria-hidden="true">⧉</span>
            <span class="timeline-tool-label">Copy</span>
          </button>

          <button class="timeline-tool timeline-tool-wide" type="button" :title="t('timelineView.paste')"
            @click="emit('paste-at-playhead')">
            <span class="timeline-tool-icon" aria-hidden="true">⎘</span>
            <span class="timeline-tool-label">Paste</span>
          </button>
        </div>
      </section>

      <section class="timeline-group timeline-group-params" aria-label="Timeline settings">
        <div class="timeline-group-label">Timeline</div>
        <div class="timeline-group-row timeline-group-row-params">
          <button class="timeline-chip" :class="{ 'is-active': snapEnabled }" type="button"
            :title="'Snap on/off'" @click="emit('update-snap', !snapEnabled)">
            <span class="timeline-chip-label">Snap</span>
            <span class="timeline-chip-value">{{ snapEnabled ? 'On' : 'Off' }}</span>
          </button>

          <div class="timeline-stepper" :aria-label="'Bars'">
            <span class="timeline-stepper-label">Bars</span>
            <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars -1'"
              @click="emit('decrement-bars-no-pickup')">
              -
            </v-btn>
            <v-text-field class="bars-count-input" density="compact" hide-details variant="outlined" type="number"
              min="1" step="1" :model-value="barsNoPickupLocal"
              @update:model-value="(v) => emit('update-bars-no-pickup', v)" />
            <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars +1'"
              @click="emit('increment-bars-no-pickup')">
              +
            </v-btn>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'

defineOptions({ name: 'TimelineInfoBar' })

defineProps({
  activeTool: { type: String, default: 'arrow' },
  barsNoPickupLocal: { type: String, default: '1' },
  snapEnabled: { type: Boolean, default: true },
})

const emit = defineEmits([
  'update-active-tool',
  'update-snap',
  'copy-selection',
  'paste-at-playhead',
  'loop-to-selection',
  'update-bars-no-pickup',
  'decrement-bars-no-pickup',
  'increment-bars-no-pickup',
])

const { t } = useI18n()
</script>

<style scoped>
.timeline-info {
  background: color-mix(in srgb, var(--color-surface) 95%, var(--color-surface-2) 5%);
  border: 0;
  border-radius: 0;
  min-height: 52px;
  padding: 6px;
}

.timeline-info-shell {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
}

.timeline-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--color-border) 88%, transparent);
  background: color-mix(in srgb, var(--color-surface-2) 48%, var(--color-surface) 52%);
  min-height: 40px;
}

.timeline-group-tools {
  min-width: 0;
}

.timeline-group-params {
  margin-left: auto;
}

.timeline-group-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.timeline-group-row-params {
  justify-content: flex-end;
}

.timeline-group-label {
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 800;
}

.timeline-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-2) 78%, var(--color-surface) 22%);
  cursor: pointer;
  user-select: none;
  padding: 0 10px;
  gap: 6px;
  transition:
    border-color var(--ui-fast),
    box-shadow var(--ui-fast),
    background-color var(--ui-fast),
    transform var(--ui-fast);
}

.timeline-tool-wide {
  min-width: 74px;
}

.timeline-tool:hover {
  background: color-mix(in srgb, var(--color-surface-2) 64%, var(--color-surface) 36%);
}

.timeline-tool.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 16%, var(--color-surface) 84%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 68%, transparent);
}

.timeline-tool-input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.timeline-tool-icon {
  font-size: 14px;
  line-height: 1;
  opacity: 0.85;
  color: var(--color-text-muted);
}

.timeline-tool-label {
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  color: var(--color-text-muted);
}

.timeline-tool.is-active .timeline-tool-icon {
  opacity: 1;
  color: var(--color-text);
}

.timeline-tool.is-active .timeline-tool-label {
  color: var(--color-text);
}

.timeline-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 88px;
  height: 28px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface) 90%, var(--color-surface-2) 10%);
  padding: 0 12px;
  color: var(--color-text);
}

.timeline-chip-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.timeline-chip-value {
  font-size: 11px;
  font-weight: 800;
}

.timeline-chip.is-active {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 14%, var(--color-surface) 86%);
}

.timeline-stepper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border-left: 1px solid color-mix(in srgb, var(--color-border) 82%, transparent);
}

.timeline-stepper-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-muted);
}

.bars-count-input {
  width: 70px;
  min-width: 70px;
}

.bars-adjust-btn {
  min-width: 24px;
  height: 24px;
  padding: 0;
}

.timeline-info :deep(.v-field) {
  --v-input-control-height: 24px;
  min-height: 24px;
}

.timeline-info :deep(.v-field__input) {
  min-height: 24px;
  padding-top: 0;
  padding-bottom: 0;
}

@media (max-width: 860px) {
  .timeline-group-params {
    margin-left: 0;
  }

  .timeline-group {
    width: 100%;
    justify-content: space-between;
  }

  .timeline-group-label {
    min-width: 46px;
  }
}
</style>
