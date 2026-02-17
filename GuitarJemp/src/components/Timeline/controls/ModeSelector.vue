<template>
  <v-card class="main-menu-shell ui-panel pa-2" variant="flat">
    <div class="main-menu">
      <v-menu location="right" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="tonal" class="control-btn options-btn" :title="t('modeSelector.options')">
            <v-icon icon="mdi-cog-outline" size="24" />
          </v-btn>
        </template>

        <v-card class="pa-3" min-width="320">
          <div class="d-flex flex-column ga-3">
            <div class="d-flex flex-column ga-2">
              <div class="text-caption control-label">{{ t('modeSelector.fretboard') }}</div>
              <div class="d-flex ga-2">
                <v-text-field v-model="numStringsLocal" density="compact" hide-details type="number" min="1" max="12"
                  step="1" style="width: 84px" :label="t('modeSelector.strings')" />

                <v-text-field v-model="numFretsLocal" density="compact" hide-details type="number" min="1" max="24"
                  step="1" style="width: 84px" :label="t('modeSelector.frets')" />
              </div>
            </div>

            <v-switch density="compact" hide-details inset :label="t('modeSelector.chordShapePanel')" :model-value="showChordShapePanel"
              @update:model-value="(v) => emit('update-show-chord-shape-panel', Boolean(v))" />
          </div>
        </v-card>
      </v-menu>

    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const props = defineProps({
  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 1 },
  numStrings: { type: Number, default: 6 },
  numFrets: { type: Number, default: 12 },
  stringsCollapsed: { type: Boolean, default: false },
  showChordShapePanel: { type: Boolean, default: false },
  simGroupMode: { type: String, default: '' },
  fretboardVisible: { type: Boolean, default: true },
  chordMenuVisible: { type: Boolean, default: true },
  timelineVisible: { type: Boolean, default: true },
  transportVisible: { type: Boolean, default: true },
  libraryPanelVisible: { type: Boolean, default: true },
  activeNotesVisible: { type: Boolean, default: true },
  libraryEnabled: { type: Boolean, default: true },
  isDarkTheme: { type: Boolean, default: false },
  isPlaying: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'update-num-strings',
  'update-frets',
  'update-strings-collapsed',
  'update-fretboard-visible',
  'update-chord-menu-visible',
  'update-show-chord-shape-panel',
  'update-sim-group-mode',
  'update-timeline-visible',
  'update-transport-visible',
  'update-library-panel-visible',
  'update-active-notes-visible',
  'open-library',
  'toggle-theme',
  'toggle-play',
  'seek-start',
])
const { t } = useI18n()

const numStringsLocal = computed({
  get: () => props.numStrings,
  set: (v) => emit('update-num-strings', Number(v)),
})

const numFretsLocal = computed({
  get: () => props.numFrets,
  set: (v) => emit('update-frets', Number(v)),
})

</script>

<style scoped>
.main-menu-shell {
  box-sizing: border-box;
  background: color-mix(in srgb, var(--color-surface) 96%, var(--color-surface-2) 4%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  width: 100%;
  height: 100%;
  align-self: flex-start;
}

.main-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 4px;
}

.control-label {
  color: var(--color-text-muted);
  font-weight: 600;
}

.main-menu-shell :deep(.v-btn-toggle .v-btn--active) {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 75%, transparent);
}

.main-menu-shell :deep(.control-btn) {
  --v-btn-height: 52px;
  width: 52px;
  min-width: 52px !important;
  min-height: 52px !important;
  height: 52px !important;
  padding-inline: 0;
  line-height: 1;
  align-self: center;
}

.main-menu-shell :deep(.control-btn .v-btn__content) {
  min-height: 52px;
  align-items: center;
  line-height: 1;
}

.options-btn :deep(.v-icon) {
  opacity: 0.9;
}

.main-menu-shell :deep(.v-btn) {
  transition: filter var(--ui-fast), box-shadow var(--ui-fast), transform var(--ui-fast);
}

.main-menu-shell :deep(.v-btn:hover) {
  filter: brightness(1.04);
}

</style>
