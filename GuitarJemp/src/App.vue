<script setup>
import Fretboard from './components/Fretboard/Fretboard.vue'
import ActiveTonesWindow from './components/ActiveTonesWindow/ActiveTonesWindow.vue'
import Timeline from './components/Timeline/Timeline.vue'
import { computed } from 'vue'
import { useInstrumentStore } from './store/useInstrument'

const instrument = useInstrumentStore()
const instrumentType = computed({
  get: () => instrument.instrumentType,
  set: (v) => instrument.setInstrumentType(v)
})
</script>

<template>
  <div id="app">
    <header>
      <h1>GuitarJemp</h1>

      <div class="instrument-selector" role="radiogroup" aria-label="Instrument">
        <label class="radio-button-square">
          <input type="radio" name="instrument" value="guitar" v-model="instrumentType" />
          <span>Guitar</span>
        </label>
        <label class="radio-button-square">
          <input type="radio" name="instrument" value="bass" v-model="instrumentType" />
          <span>Bass</span>
        </label>
        <label class="radio-button-square">
          <input type="radio" name="instrument" value="ukulele" v-model="instrumentType" />
          <span>Ukulele</span>
        </label>
      </div>
    </header>
    <div class="main-content">
      <Fretboard class="fretboard" />
      <div class="top-row">
        <Timeline class="timeline" />
        <ActiveTonesWindow class="active-tones" />
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

.instrument-selector {
  margin-top: 12px;
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
  align-items: center;
}

.instrument-label {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
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
