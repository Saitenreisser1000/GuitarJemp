<template>
  <div class="mode-selector">
    <div class="radio-buttons">
      <div class="mode-label">note:</div>
      <label v-for="label in labels" :key="label" class="radio-button-square">
        <input
          type="radio"
          name="note-value"
          :value="label"
          :checked="selectedMode === label"
          @change="emitModeChange(label)"
        />
        <span>{{ label }}</span>
      </label>
    </div>
    <div class="right-controls">
      <div class="beat-inputs">
        <div class="beat-label">Beat</div>
        <input
          class="beat-input"
          type="number"
          min="1"
          step="1"
          :value="beatTop"
          @input="emitBeatTopChange"
        />
        <select class="beat-input" :value="beatBottom" @change="emitBeatBottomChange">
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="4">4</option>
          <option :value="8">8</option>
        </select>
      </div>

      <label class="snap-toggle">
        <input type="checkbox" :checked="snapEnabled" @change="emitSnapChange" />
        <span>Snap</span>
      </label>

      <label class="snap-toggle">
        <input type="checkbox" :checked="soundPreviewEnabled" @change="emitSoundPreviewChange" />
        <span>Sound</span>
      </label>
    </div>
  </div>
</template>

<script setup>
defineProps({
  selectedMode: { type: String, required: true },
  snapEnabled: { type: Boolean, default: true },
  soundPreviewEnabled: { type: Boolean, default: true },
  beatTop: { type: Number, default: 4 },
  beatBottom: { type: Number, default: 4 }
})

const emit = defineEmits([
  'update-mode',
  'update-snap',
  'update-sound-preview',
  'update-beat-top',
  'update-beat-bottom'
])

const labels = ['1/16', '1/8', '1/4', '1/2', '1', 'sim']

function emitModeChange(label) {
  emit('update-mode', label)
}

function emitSnapChange(e) {
  emit('update-snap', e.target.checked)
}

function emitSoundPreviewChange(e) {
  emit('update-sound-preview', e.target.checked)
}

function emitBeatTopChange(e) {
  const parsed = Number.parseInt(e.target.value, 10)
  emit('update-beat-top', Number.isFinite(parsed) ? parsed : 1)
}

function emitBeatBottomChange(e) {
  const parsed = Number.parseInt(e.target.value, 10)
  const allowed = new Set([1, 2, 4, 8])
  emit('update-beat-bottom', allowed.has(parsed) ? parsed : 4)
}
</script>

<style scoped>
.mode-selector {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-bottom: 15px;
}

.radio-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.mode-label {
  font-weight: 700;
  color: #555;
  margin-right: 6px;
  text-transform: lowercase;
}

.radio-button-square {
  position: relative;
  display: inline-block;
  cursor: pointer;
  user-select: none;
}

.radio-button-square input[type='radio'] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  width: 0;
  height: 0;
}

.radio-button-square span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border: 2px solid #ccc;
  border-radius: 4px;
  background-color: #f5f5f5;
  color: #333;
  font-weight: bold;
  font-size: 14px;
  transition: all 0.3s ease;
}

.radio-button-square input[type='radio']:checked + span {
  background-color: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
}

.right-controls {
  display: flex;
  column-gap: 14px;
  row-gap: 0;
  flex-wrap: wrap;
  align-items: center;
  margin-left: auto;
}

.beat-inputs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.beat-label {
  font-size: 12px;
  color: #666;
  line-height: 1;
}

.beat-input {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.snap-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.snap-toggle input[type='checkbox'] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}
</style>
