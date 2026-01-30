<template>
  <div class="fretboard-container">
    <div class="controls">
      <div class="control-group">
        <label for="strings">Saiten:</label>
        <input
          id="strings"
          v-model.number="numStrings"
          type="number"
          min="1"
          max="12"
        />
      </div>
      <div class="control-group">
        <label for="frets">Bünde:</label>
        <input
          id="frets"
          v-model.number="numFrets"
          type="number"
          min="1"
          max="24"
        />
      </div>
    </div>

    <div class="fretboard">
      <div class="fret-numbers">
        <div class="empty-corner"></div>
        <div
          v-for="fret in numFrets"
          :key="`fret-num-${fret}`"
          class="fret-number"
        >
          {{ fret }}
        </div>
      </div>

      <div class="strings-container">
        <div
          v-for="string in numStrings"
          :key="`string-${string}`"
          class="string-row"
        >
          <div class="string-label">
            {{ string }}
          </div>
          <div class="string-line">
            <div
              v-for="fret in numFrets"
              :key="`fret-${fret}-string-${string}`"
              class="fret-position"
              @click="toggleNote(fret, string)"
              :class="{ active: isNoteActive(fret, string) }"
            >
              <div class="dot"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="info">
      <p>Insgesamt {{ numStrings }} Saiten und {{ numFrets }} Bünde</p>
      <p v-if="activeNotes.length > 0">
        Aktivierte Noten: {{ activeNotes.length }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FretboardComponent',
  emits: ['notes-changed'],
  data() {
    return {
      numStrings: 6,
      numFrets: 12,
      activeNotes: []
    };
  },
  methods: {
    toggleNote(fret, string) {
      const key = `${fret}-${string}`;
      const index = this.activeNotes.indexOf(key);
      if (index > -1) {
        this.activeNotes.splice(index, 1);
      } else {
        this.activeNotes.push(key);
      }
      this.$emit('notes-changed', this.activeNotes);
    },
    isNoteActive(fret, string) {
      return this.activeNotes.includes(`${fret}-${string}`);
    }
  },
  watch: {
    numStrings() {
      this.activeNotes = [];
      this.$emit('notes-changed', this.activeNotes);
    },
    numFrets() {
      this.activeNotes = [];
      this.$emit('notes-changed', this.activeNotes);
    }
  }
};
</script>

<style scoped>
.fretboard-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
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
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.fretboard {
  margin: 20px 0;
  border: 2px solid #333;
  border-radius: 4px;
  background-color: #f5f5dc;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: inline-block;
}

.fret-numbers {
  display: flex;
  margin-bottom: 10px;
  gap: 5px;
}

.empty-corner {
  width: 40px;
  height: 20px;
}

.fret-number {
  width: 80px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #999;
}

.strings-container {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.string-row {
  display: flex;
  gap: 5px;
  align-items: center;
}

.string-label {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #666;
  flex-shrink: 0;
  border-right: 2px solid #999;
}

.string-line {
  display: flex;
  gap: 5px;
  align-items: center;
}

.fret-position {
  width: 80px;
  height: 40px;
  border: 1px solid #999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  transition: all 0.2s ease;
}

.fret-position:hover {
  background-color: #ffe;
  transform: scale(1.05);
}

.fret-position.active {
  background-color: #d32f2f;
}

.fret-position .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #999;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.fret-position.active .dot {
  background-color: white;
  opacity: 1;
}

.info {
  margin-top: 20px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  color: #666;
}

.info p {
  margin: 5px 0;
}
</style>
