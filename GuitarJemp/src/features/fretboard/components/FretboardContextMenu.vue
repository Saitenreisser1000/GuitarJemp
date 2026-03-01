<template>
  <div class="fb-context-menu">
    <div class="fb-rail-controls fb-inline-controls">
      <v-menu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            size="small"
            variant="tonal"
            class="fb-top-control fb-note-value-btn"
            :title="t('modeSelector.noteValues')"
          >
            <span class="fb-note-glyph">{{ activeModeItem?.dotSymbol || activeModeItem?.label }}</span>
            <v-icon class="fb-note-caret" icon="mdi-chevron-down" size="14" />
          </v-btn>
        </template>

        <v-card class="pa-3 d-flex flex-column ga-3" min-width="250" variant="flat" border>
          <div class="text-caption">{{ t('modeSelector.noteValue') }}</div>
          <v-btn-toggle v-model="noteValueLocal" mandatory divided class="fb-note-toggle-row">
            <v-btn
              v-for="item in modeItems"
              :key="item.value"
              :value="item.value"
              variant="tonal"
              size="small"
              :title="item.title"
            >
              <span class="fb-note-glyph">{{ item.dotSymbol || item.label }}</span>
            </v-btn>
          </v-btn-toggle>

          <div class="text-caption">{{ t('modeSelector.modifier') }}</div>
          <v-btn-toggle v-model="noteModifierLocal" divided class="fb-note-toggle-row">
            <v-btn value="dotted" variant="tonal" size="small" :title="t('modeSelector.dotted')">.</v-btn>
            <v-btn value="3" variant="tonal" size="small" :title="t('modeSelector.triplets')">3</v-btn>
          </v-btn-toggle>
        </v-card>
      </v-menu>

      <v-btn
        size="small"
        variant="tonal"
        class="fb-top-control"
        :active="Boolean(isSimOn)"
        :color="isSimOn ? 'primary' : undefined"
        :title="isSimOn ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
        :aria-pressed="String(isSimOn)"
        @click="toggleSim"
      >
        CH
      </v-btn>

      <v-menu location="bottom start" :close-on-content-click="false">
        <template #activator="{ props: menuProps }">
          <v-btn
            v-bind="menuProps"
            size="small"
            variant="tonal"
            class="fb-top-control fb-color-btn"
            :title="t('modeSelector.symbols', { color: settings.selectedColor })"
          >
            <v-icon icon="mdi-palette-outline" size="18" />
            <span class="fb-color-swatch" :style="{ backgroundColor: settings.selectedColor }" aria-hidden="true" />
          </v-btn>
        </template>

        <v-card class="pa-2" min-width="260" variant="flat" border>
          <ColorPalette orientation="horizontal" />
        </v-card>
      </v-menu>
    </div>

    <div class="fb-fret-actions-erase">
      <button class="fb-shape-btn" :class="{ 'is-active': settings.eraseMode }" type="button" @click="toggleEraseMode">
        Erase
      </button>
      <button class="fb-shape-btn is-danger" type="button" @click="eraseAllNotes">
        Erase All
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { NOTE_VALUE_ITEMS } from '@/config/noteValues'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import ColorPalette from './ColorPalette.vue'

defineOptions({ name: 'FretboardContextMenu' })

const settings = useTimelineSettingsStore()
const notes = useNotesStore()
const selection = useSelectionStore()
const { t } = useI18n()

const modeItems = computed(() =>
  NOTE_VALUE_ITEMS.map((item) => ({
    ...item,
    title: t(`noteValues.${item.value.replace('/', '_')}`, item.title),
  })),
)

const lastNonSimMode = ref(
  settings.selectedMode !== 'sim'
    ? String(settings.selectedMode)
    : String(settings.lastRhythmMode || '1/4'),
)

watch(
  () => settings.selectedMode,
  (val) => {
    if (val !== 'sim') lastNonSimMode.value = String(val || '1/4')
  },
  { immediate: true },
)

const noteValueLocal = computed({
  get: () =>
    settings.selectedMode === 'sim' ? lastNonSimMode.value : String(settings.selectedMode || '1/4'),
  set: (v) => {
    const mode = String(v || '1/4')
    if (mode !== 'sim') lastNonSimMode.value = mode
    settings.setSelectedMode(mode)
  },
})

const activeModeItem = computed(() => {
  const activeValue = String(noteValueLocal.value || '')
  return modeItems.value.find((item) => String(item.value) === activeValue) || modeItems.value[0]
})

const noteModifierLocal = ref(String(settings.simGroupMode || ''))

watch(
  () => settings.simGroupMode,
  (val) => {
    const next = String(val || '')
    if (next !== noteModifierLocal.value) noteModifierLocal.value = next
  },
  { immediate: true },
)

watch(noteModifierLocal, (val) => {
  const next = String(val || '')
  if (next !== String(settings.simGroupMode || '')) settings.setSimGroupMode(next)
})

const isSimOn = computed(() => settings.selectedMode === 'sim')

function toggleSim() {
  if (isSimOn.value) {
    settings.setSelectedMode(lastNonSimMode.value || '1/4')
    return
  }
  settings.setSelectedMode('sim')
}

function toggleEraseMode() {
  settings.setEraseMode(!settings.eraseMode)
}

function eraseAllNotes() {
  notes.clearNotes()
  selection.clearSelection()
  const top = Number(settings.beatTop) || 4
  const bottom = Number(settings.beatBottom) || 4
  const blocksPerBar = Math.max(1, Number((top * (4 / bottom)).toFixed(3)))
  settings.setTimelineLengthBlocks(Number((blocksPerBar * 2).toFixed(3)))
}
</script>

<style scoped>
.fb-context-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fb-rail-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 0;
}

.fb-rail-controls.fb-inline-controls {
  flex-direction: row;
  align-items: center;
  flex-wrap: wrap;
}

.fb-fret-actions-erase {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.fb-context-menu :deep(.fb-top-control) {
  min-height: 28px !important;
  height: 28px !important;
  min-width: 36px;
  border-radius: 6px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
}

.fb-context-menu :deep(.fb-note-value-btn) {
  position: relative;
  padding-right: 22px;
}

.fb-note-glyph {
  line-height: 1;
  font-size: 15px;
}

.fb-note-caret {
  position: absolute;
  right: 5px;
  bottom: 4px;
  opacity: 0.75;
}

.fb-note-toggle-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.fb-context-menu :deep(.fb-color-btn) {
  position: relative;
  padding-right: 18px;
}

.fb-color-swatch {
  position: absolute;
  right: 6px;
  bottom: 4px;
  width: 9px;
  height: 9px;
  border-radius: 3px;
  border: 1px solid rgba(60, 60, 60, 0.8);
}

.fb-shape-btn {
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(50, 58, 66, 0.35);
  background: rgba(240, 240, 240, 0.85);
  color: #20242a;
  font-size: 12px;
  font-weight: 700;
  padding: 0 12px;
  cursor: pointer;
}

.fb-shape-btn:hover {
  background: rgba(225, 230, 236, 0.95);
}

.fb-shape-btn.is-active {
  background: rgba(120, 130, 140, 0.9);
  color: #fff;
}

.fb-shape-btn.is-danger {
  color: #e08d8d;
}
</style>
