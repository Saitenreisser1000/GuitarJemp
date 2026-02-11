<template>
  <v-card class="pa-3 mb-4" variant="flat" border>
    <div class="d-flex align-center flex-wrap ga-4">
      <!--div class="text-subtitle-2 text-medium-emphasis">note:</div-->

      <v-btn-toggle v-model="modeLocal" mandatory divided>
        <v-btn v-for="item in modeItems" :key="item.value" :value="item.value" variant="tonal" :title="item.title">
          <v-icon v-if="item.icon" class="mode-icon" :icon="item.icon" size="34" />
          <template v-else>{{ item.label }}</template>
        </v-btn>
      </v-btn-toggle>

      <v-menu location="bottom" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" variant="tonal" class="symbols-btn" :title="`Symbole (${selectedColor})`">
            <span>Symbole</span>
            <span class="symbols-swatch" :style="{ backgroundColor: selectedColor }" aria-hidden="true" />
          </v-btn>
        </template>

        <v-card class="pa-2" min-width="260" variant="flat" border>
          <ColorPalette orientation="horizontal" />
        </v-card>
      </v-menu>

      <div class="ms-auto d-flex align-center ga-2">
        <v-menu location="bottom end" :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" density="compact" variant="tonal"> Optionen </v-btn>
          </template>

          <v-card class="pa-3" min-width="320">
            <div class="d-flex flex-column ga-3">
              <div class="d-flex flex-column ga-2">
                <div class="text-caption text-medium-emphasis">Griffbrett</div>
                <div class="d-flex ga-2">
                  <v-text-field v-model="numStringsLocal" density="compact" hide-details type="number" min="1" max="12"
                    step="1" style="width: 84px" label="Saiten" />

                  <v-text-field v-model="numFretsLocal" density="compact" hide-details type="number" min="1" max="24"
                    step="1" style="width: 84px" label="Bünde" />
                </div>
              </div>

              <v-switch density="compact" hide-details inset label="Saiten einklappen" :model-value="stringsCollapsed"
                @update:model-value="(v) => emit('update-strings-collapsed', Boolean(v))" />

              <div class="d-flex align-center ga-2">
                <div class="text-caption text-medium-emphasis">Tondauer</div>
                <v-text-field v-model="soundDurationLocal" density="compact" hide-details type="number" min="0.1"
                  step="0.1" style="width: 92px" />
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
          </v-card>
        </v-menu>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import ColorPalette from '../../Fretboards/FretboardEdit/controls/ColorPalette.vue'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

const props = defineProps({
  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  soundDurationScale: { type: Number, default: 1 },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 },
  numStrings: { type: Number, default: 6 },
  numFrets: { type: Number, default: 12 },
  stringsCollapsed: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-sound-duration-scale',
  'update-beat-top',
  'update-beat-bottom',
  'update-num-strings',
  'update-frets',
  'update-strings-collapsed',
])

const settings = useTimelineSettingsStore()
const selectedColor = computed(() => String(settings.selectedColor || ''))

const modeItems = [
  { value: '1/16', icon: 'mdi-music-note-sixteenth', label: '1/16', title: '1/16' },
  { value: '1/8', icon: 'mdi-music-note-eighth', label: '1/8', title: '1/8' },
  { value: '1/4', icon: 'mdi-music-note-quarter', label: '1/4', title: '1/4' },
  { value: '1/2', icon: 'mdi-music-note-half', label: '1/2', title: '1/2' },
  { value: '1', icon: 'mdi-music-note-whole', label: '1', title: '1' },
  { value: 'sim', label: 'sim', title: 'sim' },
]

const beatBottomItems = [1, 2, 4, 8]

const modeLocal = computed({
  get: () => props.selectedMode,
  set: (v) => emit('update-mode', String(v)),
})

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
</script>

<style scoped>
.mode-icon {
  line-height: 1;
}

.symbols-btn :deep(.v-btn__content) {
  display: flex;
  align-items: center;
  gap: 12px;
}

.symbols-swatch {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 2px solid var(--color-border-strong);
}
</style>
