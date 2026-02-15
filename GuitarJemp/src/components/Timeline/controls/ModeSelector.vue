<template>
  <v-card class="main-menu-shell ui-panel pa-2" variant="flat">
    <div class="main-menu">
      <v-btn variant="tonal" class="control-btn undo-btn" :title="t('modeSelector.undo')" @click="emit('undo')">
        <v-icon icon="mdi-undo" size="22" />
      </v-btn>

      <v-btn variant="tonal" class="control-btn redo-btn" :title="t('modeSelector.redo')" @click="emit('redo')">
        <v-icon icon="mdi-redo" size="22" />
      </v-btn>

      <v-menu location="right" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="tonal" class="control-btn mode-menu-btn" :title="t('modeSelector.noteValues')">
            <v-icon v-if="activeModeItem?.icon" class="mode-icon" :icon="activeModeItem.icon" size="30" />
            <span v-else-if="activeModeItem?.value === '1/2'" class="note-glyph note-glyph-half" aria-label="Half note">
              <span class="note-head-outline"></span>
              <span class="note-stem"></span>
            </span>
            <span v-else-if="activeModeItem?.value === '1'" class="note-glyph note-glyph-whole" aria-label="Whole note">
              <span class="note-head-outline"></span>
            </span>
            <span v-else class="note-glyph">{{ activeModeItem?.dotSymbol || activeModeItem?.label }}</span>
            <v-icon class="mode-menu-caret" icon="mdi-chevron-down" size="14" />
          </v-btn>
        </template>

        <v-card class="pa-3 d-flex flex-column ga-3" min-width="250" variant="flat" border>
          <div class="text-caption control-label">{{ t('modeSelector.noteValue') }}</div>
          <v-btn-toggle v-model="noteValueLocal" mandatory divided class="dropdown-toggle-row">
            <v-btn v-for="item in modeItems" :key="item.value" :value="item.value" variant="tonal" class="dropdown-btn"
              :title="item.title">
              <v-icon v-if="item.icon" class="mode-icon" :icon="item.icon" size="22" />
              <span v-else-if="item.value === '1/2'" class="note-glyph note-glyph-half dropdown-note" aria-label="Half note">
                <span class="note-head-outline"></span>
                <span class="note-stem"></span>
              </span>
              <span v-else-if="item.value === '1'" class="note-glyph note-glyph-whole dropdown-note" aria-label="Whole note">
                <span class="note-head-outline"></span>
              </span>
              <span v-else class="note-glyph dropdown-note">{{ item.dotSymbol || item.label }}</span>
            </v-btn>
          </v-btn-toggle>

          <div class="text-caption control-label">{{ t('modeSelector.modifier') }}</div>
          <v-btn-toggle v-model="noteModifierLocal" divided class="dropdown-toggle-row">
            <v-btn value="dotted" variant="tonal" class="dropdown-btn" :title="t('modeSelector.dotted')">.</v-btn>
            <v-btn value="3" variant="tonal" class="dropdown-btn" :title="t('modeSelector.triplets')">3</v-btn>
          </v-btn-toggle>
        </v-card>
      </v-menu>

      <v-btn variant="tonal" class="control-btn sim-btn" :active="Boolean(isSimOn)"
        :color="isSimOn ? 'primary' : undefined" :title="isSimOn ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
        :aria-pressed="String(isSimOn)" @click="toggleSim">
        CH
      </v-btn>

      <v-btn variant="tonal" class="control-btn timeline-visibility-btn" :active="Boolean(timelineVisible)"
        :color="timelineVisible ? 'primary' : undefined" :title="timelineVisible ? t('modeSelector.hideTimeline') : t('modeSelector.showTimeline')"
        :aria-pressed="String(timelineVisible)" @click="emit('update-timeline-visible', !timelineVisible)">
        <v-icon :icon="timelineVisible ? 'mdi-eye-outline' : 'mdi-eye-off-outline'" size="22" />
      </v-btn>

      <v-btn variant="tonal" class="control-btn active-notes-visibility-btn" :active="Boolean(activeNotesVisible)"
        :color="activeNotesVisible ? 'primary' : undefined"
        :title="activeNotesVisible ? t('modeSelector.hideActiveNotes') : t('modeSelector.showActiveNotes')"
        :aria-pressed="String(activeNotesVisible)"
        @click="emit('update-active-notes-visible', !activeNotesVisible)">
        <v-icon :icon="activeNotesVisible ? 'mdi-music-note-outline' : 'mdi-music-note-off-outline'" size="22" />
      </v-btn>

      <v-btn variant="tonal" class="control-btn library-btn" :disabled="!libraryEnabled"
        :title="libraryEnabled ? t('modeSelector.openLibrary') : t('modeSelector.librarySignIn')" @click="emit('open-library')">
        <v-icon icon="mdi-cloud-outline" size="22" />
      </v-btn>

      <v-menu location="right" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="tonal" class="control-btn symbols-btn" :title="t('modeSelector.symbols', { color: selectedColor })">
            <v-icon icon="mdi-palette-outline" size="22" />
            <span class="symbols-swatch" :style="{ backgroundColor: selectedColor }" aria-hidden="true" />
          </v-btn>
        </template>

        <v-card class="pa-2" min-width="260" variant="flat" border>
          <ColorPalette orientation="horizontal" />
        </v-card>
      </v-menu>

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

            <v-switch density="compact" hide-details inset :label="t('modeSelector.collapseStrings')" :model-value="stringsCollapsed"
              @update:model-value="(v) => emit('update-strings-collapsed', Boolean(v))" />

            <div class="d-flex align-center ga-2">
              <div class="text-caption control-label">{{ t('modeSelector.toneDuration') }}</div>
              <v-text-field v-model="soundDurationLocal" density="compact" hide-details type="number" min="0.1"
                step="0.1" style="width: 92px" />
            </div>

            <div class="d-flex flex-column ga-2">
              <div class="text-caption control-label">{{ t('modeSelector.beat') }}</div>
              <div class="d-flex ga-2">
                <v-text-field density="compact" hide-details type="number" min="1" step="1" style="width: 84px"
                  :model-value="beatTop" @update:model-value="updateBeatTop" />

                <v-select density="compact" hide-details style="width: 84px" :items="beatBottomItems"
                  :model-value="beatBottom" @update:model-value="updateBeatBottom" />
              </div>
              <div class="d-flex align-center ga-2">
                <v-switch density="compact" hide-details inset :label="t('modeSelector.pickup')"
                  :model-value="pickupEnabled"
                  @update:model-value="(v) => emit('update-pickup-enabled', Boolean(v))" />
                <v-text-field density="compact" hide-details type="number" min="1" :max="pickupMax"
                  step="1" style="width: 84px" :label="t('modeSelector.beats')" :disabled="!pickupEnabled"
                  :model-value="pickupBeats" @update:model-value="updatePickupBeats" />
              </div>
            </div>

            <v-switch density="compact" hide-details inset :label="t('modeSelector.snap')" :model-value="snapEnabled"
              @update:model-value="(v) => emit('update-snap', Boolean(v))" />

            <v-switch density="compact" hide-details inset :label="t('modeSelector.sound')" :model-value="soundPreviewEnabled"
              @update:model-value="(v) => emit('update-sound-preview', Boolean(v))" />

            <v-btn density="comfortable" variant="tonal"
              :prepend-icon="isDarkTheme ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
              @click="emit('toggle-theme')">
              {{ isDarkTheme ? t('modeSelector.light') : t('modeSelector.dark') }}
            </v-btn>
          </div>
        </v-card>
      </v-menu>
    </div>
  </v-card>
</template>

<script setup>
import { computed, watch, ref } from 'vue'
import ColorPalette from '../../Fretboards/FretboardEdit/controls/ColorPalette.vue'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { NOTE_VALUE_ITEMS } from '@/config/noteValues'
import { useI18n } from '@/i18n'

const props = defineProps({
  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  soundDurationScale: { type: Number, default: 1 },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  pickupEnabled: { type: Boolean, default: false },
  pickupBeats: { type: Number, default: 1 },
  numStrings: { type: Number, default: 6 },
  numFrets: { type: Number, default: 12 },
  stringsCollapsed: { type: Boolean, default: false },
  simGroupMode: { type: String, default: '' },
  timelineVisible: { type: Boolean, default: true },
  activeNotesVisible: { type: Boolean, default: true },
  libraryEnabled: { type: Boolean, default: true },
  isDarkTheme: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-sound-duration-scale',
  'update-beat-top',
  'update-beat-bottom',
  'update-pickup-enabled',
  'update-pickup-beats',
  'update-num-strings',
  'update-frets',
  'update-strings-collapsed',
  'update-sim-group-mode',
  'update-timeline-visible',
  'update-active-notes-visible',
  'open-library',
  'toggle-theme',
  'undo',
  'redo',
])
const { t } = useI18n()
// Local state for the note-length modifier toggle group (dot/triplet).
const noteModifierLocal = ref(props.simGroupMode)

watch(
  () => props.simGroupMode,
  (val) => {
    if (val !== noteModifierLocal.value) noteModifierLocal.value = val
  },
)

watch(noteModifierLocal, (val) => {
  if (val !== props.simGroupMode) emit('update-sim-group-mode', val)
})

const settings = useTimelineSettingsStore()
const selectedColor = computed(() => String(settings.selectedColor || ''))

const modeItems = computed(() =>
  NOTE_VALUE_ITEMS.map((item) => ({
    ...item,
    title: t(`noteValues.${item.value.replace('/', '_')}`, item.title),
  })),
)
const activeModeItem = computed(() => {
  const activeValue = String(noteValueLocal.value || '')
  return modeItems.value.find((item) => String(item.value) === activeValue) || modeItems.value[0]
})

const beatBottomItems = [1, 2, 4, 8]
const pickupMax = computed(() => {
  const top = Number.parseInt(String(props.beatTop), 10)
  const maxByBeat = Number.isFinite(top) && top > 1 ? top - 1 : 1
  return Math.max(1, Math.min(9, maxByBeat))
})

const lastNonSimMode = ref(props.selectedMode !== 'sim' ? String(props.selectedMode) : '1/4')

watch(
  () => props.selectedMode,
  (val) => {
    if (val !== 'sim') lastNonSimMode.value = String(val)
  },
  { immediate: true },
)

const noteValueLocal = computed({
  get: () => (props.selectedMode === 'sim' ? lastNonSimMode.value : props.selectedMode),
  set: (v) => {
    const mode = String(v)
    if (mode !== 'sim') lastNonSimMode.value = mode
    emit('update-mode', mode)
  },
})

const isSimOn = computed(() => props.selectedMode === 'sim')

function toggleSim() {
  if (isSimOn.value) {
    emit('update-mode', lastNonSimMode.value || '1/4')
    return
  }
  emit('update-mode', 'sim')
}

const soundDurationLocal = computed({
  get: () => props.soundDurationScale,
  set: (v) => emit('update-sound-duration-scale', Number(v)),
})

const numStringsLocal = computed({
  get: () => props.numStrings,
  set: (v) => emit('update-num-strings', Number(v)),
})

const numFretsLocal = computed({
  get: () => props.numFrets,
  set: (v) => emit('update-frets', Number(v)),
})

function updateBeatTop(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-top', Number.isFinite(parsed) && parsed > 0 ? parsed : 1)
}

function updateBeatBottom(v) {
  const parsed = Number.parseInt(String(v), 10)
  emit('update-beat-bottom', beatBottomItems.includes(parsed) ? parsed : 4)
}

function updatePickupBeats(v) {
  const parsed = Number.parseInt(String(v), 10)
  if (!Number.isFinite(parsed)) return
  const next = Math.max(1, Math.min(pickupMax.value, parsed))
  emit('update-pickup-beats', next)
}
</script>

<style scoped>
.mode-icon {
  line-height: 1;
}

.note-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4em;
  font-size: 30px;
  line-height: 1;
  font-weight: 500;
  font-family: 'STIX Two Text', 'Times New Roman', serif;
}

.note-glyph-half,
.note-glyph-whole {
  position: relative;
  width: 28px;
  height: 28px;
  font-family: inherit;
}

.note-head-outline {
  position: absolute;
  left: 7px;
  top: 10px;
  width: 13px;
  height: 9px;
  border: 2px solid currentColor;
  border-radius: 50%;
  transform: rotate(-18deg);
}

.note-stem {
  position: absolute;
  left: 18px;
  top: 1px;
  width: 2px;
  height: 16px;
  background: currentColor;
  border-radius: 2px;
}

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

.mode-menu-btn {
  position: relative;
}

.mode-menu-caret {
  position: absolute;
  right: 4px;
  bottom: 4px;
  opacity: 0.7;
}

.symbols-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.symbols-swatch {
  position: absolute;
  right: 8px;
  bottom: 8px;
  width: 11px;
  height: 11px;
  border-radius: 3px;
  border: 2px solid var(--color-border-strong);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-surface) 90%, transparent);
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

.dropdown-toggle-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dropdown-btn {
  --v-btn-height: 38px;
  min-height: 38px !important;
  height: 38px !important;
  min-width: 38px;
  padding: 0 10px;
}

.dropdown-note {
  font-size: 22px;
  min-width: 1.2em;
}

.sim-btn :deep(.v-icon),
.options-btn :deep(.v-icon),
.symbols-btn :deep(.v-icon) {
  opacity: 0.9;
}

.main-menu-shell :deep(.v-btn) {
  transition: filter var(--ui-fast), box-shadow var(--ui-fast), transform var(--ui-fast);
}

.main-menu-shell :deep(.v-btn:hover) {
  filter: brightness(1.04);
}

</style>
