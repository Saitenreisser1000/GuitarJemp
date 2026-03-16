<template>
  <div class="fb-context-menu">
    <div class="fb-rail-controls fb-inline-controls">
      <div class="fb-note-panel">
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
            <span class="fb-note-glyph">
              <img
                v-if="hasNoteIcon(item)"
                class="fb-note-glyph-img"
                :src="item.icon"
                alt=""
                aria-hidden="true"
                @error="markNoteIconError(item.icon)"
              />
              <span v-else>{{ noteGlyphText(item) }}</span>
            </span>
          </v-btn>
        </v-btn-toggle>

        <div class="fb-modifier-sections">
          <div class="fb-modifier-section">
            <div class="text-caption">Modifier</div>
            <v-btn-toggle v-model="noteModifierLocal" divided class="fb-note-toggle-row">
              <v-btn value="dotted" variant="tonal" size="small" :title="t('modeSelector.dotted')">.</v-btn>
              <v-btn value="3" variant="tonal" size="small" :title="t('modeSelector.triplets')">3</v-btn>
            </v-btn-toggle>
          </div>
          <span class="fb-modifier-divider" aria-hidden="true"></span>
          <div class="fb-chord-section">
            <div class="text-caption fb-chord-heading">Chords</div>
            <v-btn
              size="small"
              variant="tonal"
              class="fb-modifier-chord-btn"
              :active="Boolean(isSimOn)"
              :color="isSimOn ? 'primary' : undefined"
              :title="isSimOn ? t('modeSelector.disableChord') : t('modeSelector.enableChord')"
              :aria-pressed="String(isSimOn)"
              @click="toggleSim"
            >
              <span class="fb-chord-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                  <line x1="7.75" y1="2" x2="7.75" y2="22" />
                  <ellipse cx="12.4" cy="7.1" rx="5.1" ry="3.6" transform="rotate(-34 12.4 7.1)" />
                  <ellipse cx="12.4" cy="15.4" rx="5.1" ry="3.6" transform="rotate(-34 12.4 15.4)" />
                </svg>
              </span>
            </v-btn>
          </div>
        </div>
      </div>
      <hr class="fb-tool-separator" />

      <div class="fb-color-inline" :title="t('modeSelector.symbols', { color: settings.selectedColor })">
        <ColorPalette orientation="horizontal" />
      </div>

      <button
        class="fb-shape-btn"
        :class="{ 'is-active': isCommentMode }"
        type="button"
        @click="toggleCommentMode"
      >
        Comment
      </button>
    </div>

    <div class="fb-fret-actions-erase">
      <button
        class="fb-shape-btn fb-delete-toggle"
        :class="{ 'is-active': settings.eraseMode }"
        type="button"
        @click="toggleEraseMode"
      >
        Delete
      </button>
      <div ref="clearWrapEl" class="fb-clear-wrap">
        <button class="fb-shape-btn is-danger" type="button" @click="onClearFretboardClick">
          Clear Fretboard
        </button>
        <div v-if="clearConfirmOpen" class="fb-clear-confirm-menu" @click.stop>
          <div class="fb-clear-confirm-text">
            {{ clearDeleteCount }} Elemente löschen?
          </div>
          <div class="fb-clear-confirm-actions">
            <button class="fb-clear-confirm-btn" type="button" @click="clearConfirmOpen = false">Abbrechen</button>
            <button class="fb-clear-confirm-btn is-danger" type="button" @click="confirmEraseAllNotes">Löschen</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { NOTE_VALUE_ITEMS } from '@/config/noteValues'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useNotesStore } from '@/store/useNotes'
import { useSelectionStore } from '@/store/useSelection'
import { useUiModeStore, SURFACE_MODES } from '@/store/useUiMode'
import { TIMELINE_LAYOUT } from '@/features/timeline/config/timelineLayout'
import ColorPalette from './ColorPalette.vue'

defineOptions({ name: 'FretboardContextMenu' })

const settings = useTimelineSettingsStore()
const notes = useNotesStore()
const selection = useSelectionStore()
const uiMode = useUiModeStore()
const { t } = useI18n()
const iconErrorBySrc = ref({})
const clearConfirmOpen = ref(false)
const clearWrapEl = ref(null)

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
const isCommentMode = computed(() => uiMode.surfaceMode === SURFACE_MODES.COMMENT)
const clearDeleteCount = computed(() =>
  Array.isArray(notes.activeNotes) ? notes.activeNotes.length : 0,
)

function hasNoteIcon(item) {
  const src = String(item?.icon || '').trim()
  if (!src) return false
  return !iconErrorBySrc.value[src]
}

function markNoteIconError(src) {
  const key = String(src || '').trim()
  if (!key) return
  if (iconErrorBySrc.value[key]) return
  iconErrorBySrc.value = { ...iconErrorBySrc.value, [key]: true }
}

function noteGlyphText(item) {
  return String(item?.fallbackSymbol || item?.dotSymbol || item?.label || '')
}

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
  const bars = Math.max(1, Number(TIMELINE_LAYOUT.bars.defaultCount) || 2)
  settings.setTimelineLengthBlocks(Number((blocksPerBar * bars).toFixed(3)))
}

function onClearFretboardClick() {
  if (clearDeleteCount.value > 15) {
    clearConfirmOpen.value = true
    return
  }
  eraseAllNotes()
}

function confirmEraseAllNotes() {
  clearConfirmOpen.value = false
  eraseAllNotes()
}

function onWindowPointerDown(event) {
  if (!clearConfirmOpen.value) return
  const wrap = clearWrapEl.value
  const target = event?.target
  if (!wrap || !target) return
  if (wrap.contains(target)) return
  clearConfirmOpen.value = false
}

function toggleCommentMode() {
  uiMode.setSurfaceMode(isCommentMode.value ? SURFACE_MODES.COMPOSE : SURFACE_MODES.COMMENT)
}

onMounted(() => {
  window.addEventListener('pointerdown', onWindowPointerDown, true)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onWindowPointerDown, true)
})
</script>

<style scoped>
.fb-context-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 100%;
  height: 100%;
  box-sizing: border-box;
}

.fb-rail-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 0;
}

.fb-rail-controls.fb-inline-controls {
  flex-direction: column;
  align-items: stretch;
  flex-wrap: nowrap;
}

.fb-note-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fb-modifier-sections {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.fb-modifier-section,
.fb-chord-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fb-chord-section {
  align-items: center;
}

.fb-modifier-divider {
  width: 1px;
  align-self: stretch;
  background: rgba(70, 70, 70, 0.3);
}

.fb-chord-heading {
  min-width: 44px;
  text-align: center;
}

.fb-modifier-chord-btn {
  min-width: 44px !important;
  width: 44px;
  min-height: 44px !important;
  height: 44px !important;
  border-radius: 6px !important;
  padding: 0 !important;
}

.fb-tool-separator {
  width: 100%;
  margin: 2px 0;
  border: 0;
  border-top: 1px solid rgba(70, 70, 70, 0.25);
}

.fb-fret-actions-erase {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: auto;
  margin-bottom: 8px;
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

.fb-note-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-size: 15px;
}

.fb-chord-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.fb-chord-icon svg {
  width: 18px;
  height: 18px;
  overflow: visible;
}

.fb-chord-icon path {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fb-chord-icon line {
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
}

.fb-chord-icon ellipse {
  fill: currentColor;
  stroke: none;
}

.fb-note-glyph-img {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.fb-note-toggle-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.fb-note-toggle-row :deep(.v-btn) {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}

.fb-color-inline {
  width: 100%;
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

.fb-fret-actions-erase .fb-shape-btn {
  border-color: #f1222e;
  background: transparent;
  color: #f1222e;
}

.fb-fret-actions-erase .fb-shape-btn:hover {
  background: rgba(241, 34, 46, 0.12);
}

.fb-fret-actions-erase .fb-delete-toggle {
  border-color: #f1222e;
  background: transparent;
  color: #f1222e;
}

.fb-fret-actions-erase .fb-delete-toggle:hover {
  background: rgba(241, 34, 46, 0.12);
}

.fb-fret-actions-erase .fb-delete-toggle.is-active {
  border-color: #f1222e;
  background: #f1222e;
  color: #fff;
}

.fb-clear-wrap {
  position: relative;
  display: inline-flex;
}

.fb-clear-confirm-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 30;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 250px;
  border: 1px solid rgba(20, 24, 28, 0.2);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.fb-clear-confirm-text {
  font-size: 12px;
  font-weight: 600;
  color: #1f2328;
}

.fb-clear-confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

.fb-clear-confirm-btn {
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgba(42, 48, 56, 0.2);
  background: #f4f5f7;
  color: #232a31;
  font-size: 12px;
  font-weight: 700;
  padding: 0 10px;
  cursor: pointer;
}

.fb-clear-confirm-btn.is-danger {
  border-color: #f1222e;
  background: #f1222e;
  color: #fff;
}
</style>
