<template>
  <div
    class="palette"
    :class="{ horizontal: orientation === 'horizontal' }"
    role="radiogroup"
    aria-label="Farbauswahl"
  >
    <label v-for="c in colors" :key="c" class="color-item">
      <input type="radio" name="note-color" :value="c" :checked="selectedColor === c" @change="select(c)" />
      <span class="swatch" :style="{ backgroundColor: c }" />
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

defineOptions({ name: 'ColorPalette' })

defineProps({
  orientation: {
    type: String,
    default: 'vertical'
  }
})

const settings = useTimelineSettingsStore()

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']

const selectedColor = computed(() => settings.selectedColor)

function select(color) {
  settings.setSelectedColor(color)
}
</script>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  height: 100%;
  justify-content: center;
}

.palette.horizontal {
  flex-direction: row;
  height: auto;
  justify-content: flex-start;
  padding: 6px 8px;
  gap: 8px;
}

.color-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.color-item input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.swatch {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 2px solid rgba(0, 0, 0, 0.25);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.color-item input:checked + .swatch {
  border-color: rgba(20, 20, 20, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85), 0 2px 8px rgba(0, 0, 0, 0.18);
}
</style>
