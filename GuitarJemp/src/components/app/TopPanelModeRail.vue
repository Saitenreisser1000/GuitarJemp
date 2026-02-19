<script setup>
defineOptions({ name: 'TopPanelModeRail' })

const props = defineProps({
  modelValue: { type: String, default: 'timeline' },
})

const emit = defineEmits(['update:modelValue'])

function setMode(mode) {
  emit('update:modelValue', mode)
}
</script>

<template>
  <div class="timeline-mode-rail">
    <v-btn
      class="timeline-mode-btn"
      size="small"
      :variant="props.modelValue === 'timeline' ? 'flat' : 'tonal'"
      :color="props.modelValue === 'timeline' ? 'primary' : undefined"
      @click="setMode('timeline')"
    >
      Timeline
    </v-btn>
    <v-btn
      class="timeline-mode-btn"
      size="small"
      :variant="props.modelValue === 'library' ? 'flat' : 'tonal'"
      :color="props.modelValue === 'library' ? 'primary' : undefined"
      @click="setMode('library')"
    >
      Library
    </v-btn>
    <v-btn
      class="timeline-mode-btn"
      size="small"
      :variant="props.modelValue === 'share' ? 'flat' : 'tonal'"
      :color="props.modelValue === 'share' ? 'primary' : undefined"
      @click="setMode('share')"
    >
      Share
    </v-btn>
  </div>
</template>

<style scoped>
.timeline-mode-rail {
  position: fixed;
  top: 78px;
  left: var(--fixed-panel-left);
  width: var(--timeline-rail-w);
  height: calc((100vh - 78px) / 2);
  padding: 12px 8px;
  border-right: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface-2) 76%, var(--color-surface) 24%);
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: visible;
}

.timeline-mode-btn {
  width: 100%;
  min-height: 38px;
  justify-content: flex-start;
  text-transform: none;
  font-size: 0.9rem;
  font-weight: 700;
  padding-inline: 12px;
}
</style>
