<template>
  <div class="timeline-info ui-panel">
    <div class="d-flex align-center ga-2 flex-wrap pa-1">
      <div class="timeline-info-tools d-flex align-center ga-2" :aria-label="t('timelineView.tools')">
        <label class="timeline-tool" :class="{ 'is-active': String(activeTool) === 'arrow' }"
          :title="t('timelineView.arrow')">
          <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="arrow"
            :checked="String(activeTool) === 'arrow'" @change="emit('update-active-tool', 'arrow')" />
          <span class="timeline-tool-icon" aria-hidden="true">➤</span>
        </label>

        <label class="timeline-tool" :class="{ 'is-active': String(activeTool) === 'select' }"
          :title="t('timelineView.selectionRect')">
          <input class="timeline-tool-input" type="radio" name="timeline-active-tool" value="select"
            :checked="String(activeTool) === 'select'" @change="emit('update-active-tool', 'select')" />
          <span class="timeline-tool-icon" aria-hidden="true">▭</span>
        </label>

        <button class="timeline-tool" type="button" :title="t('timelineView.copy')" @click="emit('copy-selection')">
          <span class="timeline-tool-icon" aria-hidden="true">⧉</span>
        </button>

        <button class="timeline-tool" type="button" :title="t('timelineView.paste')" @click="emit('paste-at-playhead')">
          <span class="timeline-tool-icon" aria-hidden="true">⎘</span>
        </button>

      </div>

      <div class="bars-input-wrap d-flex align-center ga-2 ms-auto">
        <div class="text-caption bars-label">Bars:</div>
        <v-text-field class="bars-count-input" density="compact" hide-details variant="outlined" type="number"
          min="1" step="1" :model-value="barsNoPickupLocal"
          @update:model-value="(v) => emit('update-bars-no-pickup', v)" />
        <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars -1'"
          @click="emit('decrement-bars-no-pickup')">
          -
        </v-btn>
        <v-btn size="x-small" variant="tonal" class="bars-adjust-btn" :title="'Bars +1'"
          @click="emit('increment-bars-no-pickup')">
          +
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from '@/i18n'

defineOptions({ name: 'TimelineInfoBar' })

defineProps({
  activeTool: { type: String, default: 'arrow' },
  barsNoPickupLocal: { type: String, default: '1' },
})

const emit = defineEmits([
  'update-active-tool',
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
  min-height: 28px;
}

.timeline-info-tools {
  min-width: 0;
  flex-wrap: wrap;
}

.timeline-tool {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 22px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-2) 78%, var(--color-surface) 22%);
  cursor: pointer;
  user-select: none;
  padding: 0;
  transition:
    border-color var(--ui-fast),
    box-shadow var(--ui-fast),
    background-color var(--ui-fast),
    transform var(--ui-fast);
}

.timeline-tool-text {
  font-size: 10px;
  font-weight: 700;
  color: var(--color-text-muted);
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
  font-size: 15px;
  line-height: 1;
  opacity: 0.85;
  color: var(--color-text-muted);
}

.timeline-tool.is-active .timeline-tool-icon {
  opacity: 1;
  color: var(--color-text);
}

.bars-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.bars-input-wrap {
  min-width: 164px;
}

.bars-count-input {
  width: 96px;
  min-width: 96px;
}

.bars-adjust-btn {
  min-width: 22px;
  height: 22px;
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
</style>
