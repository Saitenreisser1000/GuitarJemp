<template>
  <div class="controls">
    <div class="control-group">
      <label for="strings">Saiten:</label>
      <input
        id="strings"
        v-model.number="numStringsLocal"
        type="number"
        min="1"
        max="12"
      />
    </div>
    <div class="control-group">
      <label for="frets">Bünde:</label>
      <input
        id="frets"
        v-model.number="numFretsLocal"
        type="number"
        min="1"
        max="24"
      />
    </div>
  </div>
</template>

<script setup>
import { watch, ref } from 'vue'
import { useInstrumentStore } from '@/store/useInstrument'

const store = useInstrumentStore()

/**
 * Local copy of numStrings to avoid binding directly to store refs
 */
const numStringsLocal = ref(store.numStrings)

/**
 * Local copy of numFrets to emit changes to parent
 */
const numFretsLocal = ref(12)

const emit = defineEmits(['update-frets'])

/**
 * Watch for changes and update store/parent
 */
watch(numStringsLocal, (v) => store.setNumStrings(Number(v)))
watch(numFretsLocal, (v) => {
  emit('update-frets', Number(v))
})
</script>

<style scoped>
.controls {
  display: flex;
  gap: 20px;
  padding: 10px 0;
  align-items: center;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-group label {
  font-weight: bold;
  min-width: 60px;
}

.control-group input {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.control-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}
</style>
