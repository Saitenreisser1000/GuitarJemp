<script setup>
import { computed } from 'vue';
import Fretboard from './components/Fretboard/Fretboard.vue';
import ActiveTonesWindow from './ActiveTonesWindow.vue';
import Timeline from './components/Timeline/Timeline.vue';
import { useNotesStore } from './store/useNotes'

const store = useNotesStore()
const activeNotes = computed(() => store.activeNotes)
const numStrings = computed(() => store.numStrings)

function handleRemoveNote(noteKey) {
  store.removeNote(noteKey)
}
</script>

<template>
  <div id="app">
    <header>
      <h1>GuitarJemp</h1>
    </header>
    <div class="main-content">
      <Fretboard class="fretboard" />
      <div class="top-row">
        <Timeline
          class="timeline"
          :active-notes="activeNotes"
          :num-strings="numStrings"
        />
        <ActiveTonesWindow
          class="active-tones"
          :active-notes="activeNotes"
          @remove-note="handleRemoveNote"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: Arial, sans-serif;
}

header {
  text-align: center;
  color: white;
  margin-bottom: 30px;
}

header h1 {
  font-size: 2.5em;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.top-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: center;
  flex-wrap: wrap;
}

.timeline {
  flex: 1 1 800px;
  min-width: 600px;
}

.active-tones {
  flex: 0 0 380px;
}

.fretboard {
  width: 100%;
}

@media (max-width: 1024px) {
  .top-row {
    flex-direction: column;
    align-items: center;
  }

  .timeline {
    min-width: 0;
    width: 100%;
  }
}
</style>
