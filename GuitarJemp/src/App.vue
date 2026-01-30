<script setup>
import { ref } from 'vue';
import FretboardComponent from './FretboardComponent.vue';
import ActiveTonesWindow from './ActiveTonesWindow.vue';
import TimelineComponent from './TimelineComponent.vue';

const activeNotes = ref([]);
const numStrings = ref(6);

function handleRemoveNote(noteKey) {
  const index = activeNotes.value.indexOf(noteKey);
  if (index > -1) {
    activeNotes.value.splice(index, 1);
  }
}
</script>

<template>
  <div id="app">
    <header>
      <h1>GuitarJemp</h1>
    </header>
    <div class="main-content">
      <div class="left-panel">
        <FretboardComponent
          ref="fretboard"
          @notes-changed="activeNotes = $event"
        />
        <ActiveTonesWindow
          :active-notes="activeNotes"
          @remove-note="handleRemoveNote"
        />
      </div>
      <TimelineComponent
        :active-notes="activeNotes"
        :num-strings="numStrings"
      />
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
  gap: 30px;
  max-width: 1400px;
  margin: 0 auto;
  flex-wrap: wrap;
  justify-content: center;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
    align-items: center;
  }
}
</style>
