<template>
  <div class="timeline-container">
    <h2>Zeitliche Abfolge</h2>
    <div class="timeline-controls">
      <button @click="isPlaying ? stopPlayback() : startPlayback()" class="play-btn">
        {{ isPlaying ? '⏸ Stop' : '▶ Abspielen' }}
      </button>
      <input
        v-model.number="tempo"
        type="range"
        min="30"
        max="200"
        class="tempo-slider"
        @change="updateTempo"
      />
      <span class="tempo-label">Tempo: {{ tempo }} BPM</span>
    </div>

    <div class="radio-buttons">
      <label class="radio-button-square">
        <input type="radio" v-model="selectedMode" value="mode1" />
        <span>1/16</span>
      </label>
      <label class="radio-button-square">
        <input type="radio" v-model="selectedMode" value="mode2" />
        <span>1/8</span>
      </label>
      <label class="radio-button-square">
        <input type="radio" v-model="selectedMode" value="mode3" />
        <span>1/4</span>
      </label>
      <label class="radio-button-square">
        <input type="radio" v-model="selectedMode" value="mode4" />
        <span>1/2</span>
      </label>
      <label class="radio-button-square">
        <input type="radio" v-model="selectedMode" value="mode5" />
        <span>1</span>
      </label>
    </div>

    <div class="timeline">
      <div class="timeline-header">
        <div class="time-markers">
          <div
            v-for="time in Math.ceil(totalDuration / 500)"
            :key="`time-${time}`"
            class="time-marker"
            :style="{ left: (time * 500) / totalDuration * 100 + '%' }"
          >
            {{ ((time * 500) / 1000).toFixed(1) }}s
          </div>
        </div>
        <div class="playhead" :style="{ left: playheadPosition + '%' }"></div>
      </div>

      <div class="strings-timeline">
        <div
          v-for="string in numStrings"
          :key="`string-${string}`"
          class="string-line"
        >
          <div class="string-label">Saite {{ string }}</div>
          <div class="timeline-track">
            <div class="grid-background"></div>
            <div class="playhead-indicator" :style="{ left: playheadPosition + '%' }"></div>
            <div
              v-for="(note, index) in getNotesForString(string)"
              :key="`note-${note.fret}-${string}-${index}`"
              class="note-event"
              draggable="true"
              :style="{
                left: (note.time / totalDuration) * 100 + '%',
                backgroundColor: getNoteColor(note.fret)
              }"
              :title="`Bund ${note.fret}, Zeit: ${(note.time / 1000).toFixed(2)}s`"
              @dragstart="startDragNote($event, note, string, index)"
              @drag="dragNote($event, note, string)"
              @dragend="endDragNote($event, note, string, index)"
            >
              <span class="fret-number">{{ note.fret }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="info">
      <p><strong>Gesamtdauer:</strong> {{ (totalDuration / 1000).toFixed(2) }}s</p>
      <p><strong>Töne insgesamt:</strong> {{ totalNotes }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TimelineComponent',
  props: {
    activeNotes: {
      type: Array,
      required: true
    },
    numStrings: {
      type: Number,
      default: 6
    }
  },
  data() {
    return {
      noteActivationTimes: [],
      isPlaying: false,
      playheadPosition: 0,
      tempo: 120,
      currentTime: 0,
      animationFrameId: null,
      draggedNote: null,
      dragStartX: 0,
      dragTrackElement: null,
      selectedMode: 'mode1'
    };
  },
  computed: {
    totalDuration() {
      if (this.noteActivationTimes.length === 0) return 5000;
      return Math.max(...this.noteActivationTimes.map(n => n.time)) + 500;
    },
    totalNotes() {
      return this.noteActivationTimes.length;
    }
  },
  watch: {
    activeNotes: {
      deep: true,
      handler() {
        this.recordNoteActivation();
      }
    }
  },
  methods: {
    recordNoteActivation() {
      const gridSize = 50; // Größe der note-event in Pixeln
      const gridTime = (gridSize / 100) * this.totalDuration; // Zeit pro Grid-Block

      // Erstelle neue Noten mit zeitlichen Abständen basierend auf ihrer Reihenfolge
      const newNotes = this.activeNotes.map((noteKey, index) => {
        const [fret, string] = noteKey.split('-').map(Number);
        const noteTime = (index * gridSize)+gridSize/2//index * gridTime; // Jeder Ton rückt um einen Block weiter


        return { fret, string, time: noteTime };
      });

      this.noteActivationTimes = newNotes.sort((a, b) => a.time - b.time);
    },
    getNotesForString(string) {
      return this.noteActivationTimes.filter(note => note.string === string);
    },
    getNoteColor(fret) {
      const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#AED6F1',
        '#D5A6BD', '#A9DFBF', '#F5B7B1', '#FAD7A0', '#D7BDE2'
      ];
      return colors[fret % colors.length];
    },
    startPlayback() {
      if (this.totalNotes === 0) return;

      this.isPlaying = true;
      this.currentTime = 0;
      this.playheadPosition = 0;
      this.recordNoteActivation();

      const startTime = Date.now();
      const animate = () => {
        const elapsed = (Date.now() - startTime) * (this.tempo / 120);
        this.currentTime = elapsed;
        this.playheadPosition = (elapsed / this.totalDuration) * 100;

        if (this.playheadPosition >= 100) {
          this.stopPlayback();
        } else {
          this.animationFrameId = requestAnimationFrame(animate);
        }
      };

      this.animationFrameId = requestAnimationFrame(animate);
    },
    stopPlayback() {
      this.isPlaying = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.currentTime = 0;
      this.playheadPosition = 0;
    },
    updateTempo() {
      if (this.isPlaying) {
        this.stopPlayback();
      }
    },
    startDragNote(event, note, string, index) {
      this.draggedNote = { note, string, index };
      this.dragStartX = event.clientX;
      this.dragTrackElement = event.target.closest('.timeline-track');
      event.dataTransfer.effectAllowed = 'move';
    },
    dragNote(event, note, string) {
      if (!this.draggedNote || !this.dragTrackElement || event.clientX === 0) return;

      const trackRect = this.dragTrackElement.getBoundingClientRect();
      const offsetX = event.clientX - trackRect.left;

      // Grid-Rasterung basierend auf 50px note-event Breite
      const gridSize = 50; // Größe der note-event in Pixeln

      // Berechne die Raster-Position (linke Kante sollte auf Grid-Linien liegen)
      const snappedOffsetX = Math.round(offsetX / gridSize) * gridSize;
      const clampedOffsetX = Math.max(0, Math.min(trackRect.width, snappedOffsetX));

      const percentage = (clampedOffsetX / trackRect.width) * 100;
      const newTime = (percentage / 100) * this.totalDuration;

      note.time = Math.max(0, newTime);
    },
    endDragNote(event, note, string, index) {
      this.draggedNote = null;
      this.dragStartX = 0;
      this.dragTrackElement = null;
      this.noteActivationTimes = this.noteActivationTimes.sort(
        (a, b) => a.time - b.time
      );
    }
  },
  beforeUnmount() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
};
</script>

<style scoped>
.timeline-container {
  padding: 20px;
  border: 2px solid #333;
  border-radius: 4px;
  background-color: #f9f9f9;
  min-width: 600px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.timeline-controls {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.radio-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  justify-content: center;
  flex-wrap: wrap;
}

.radio-button-square {
  position: relative;
  display: inline-block;
  cursor: pointer;
  user-select: none;
}

.radio-button-square input[type="radio"] {
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

.radio-button-square input[type="radio"]:checked + span {
  background-color: #667eea;
  color: white;
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
  transform: scale(1.05);
}

.radio-button-square:hover span {
  border-color: #667eea;
  background-color: #f0f0ff;
}

.radio-button-square input[type="radio"]:checked:hover + span {
  background-color: #667eea;
}

.play-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.play-btn:hover {
  background-color: #45a049;
}

.tempo-slider {
  flex: 1;
  max-width: 200px;
  cursor: pointer;
}

.tempo-label {
  color: #666;
  font-size: 14px;
  min-width: 110px;
}

.timeline {
  position: relative;
  margin-bottom: 20px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
  overflow: hidden;
}

.timeline-header {
  position: relative;
  height: 30px;
  background-color: #f0f0f0;
  border-bottom: 2px solid #ddd;
  display: flex;
  align-items: center;
}

.time-markers {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
}

.time-marker {
  position: absolute;
  font-size: 12px;
  color: #999;
  transform: translateX(-50%);
  border-left: 1px solid #ddd;
  padding-left: 5px;
  height: 100%;
  display: flex;
  align-items: center;
}

.playhead {
  position: absolute;
  width: 3px;
  height: 100%;
  background-color: #d32f2f;
  z-index: 10;
  transform: translateX(-50%);
}

.strings-timeline {
  position: relative;
}

.string-line {
  display: flex;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s ease;
}

.string-line:hover {
  background-color: #f5f5f5;
}

.string-label {
  width: 80px;
  padding: 10px;
  font-weight: bold;
  color: #666;
  background-color: #f0f0f0;
  border-right: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-track {
  position: relative;
  flex: 1;
  height: 60px;
  background: linear-gradient(to right, transparent 0%, transparent 100%);
}

.grid-background {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    to right,
    #d0d0d0 0px,
    #d0d0d0 2px,
    transparent 2px,
    transparent 50px
  );
  pointer-events: none;
  z-index: 1;
}

.playhead-indicator {
  position: absolute;
  width: 3px;
  height: 100%;
  background-color: rgba(211, 47, 47, 0.3);
  z-index: 5;
  transform: translateX(-50%);
  pointer-events: none;
}

.note-event {
  position: absolute;
  width: 50px;
  height: 40px;
  top: 10px;
  transform: translateX(-50%);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  color: white;
  font-weight: bold;
  font-size: 12px;
  user-select: none;
  z-index: 10;
}

.note-event:active {
  cursor: grabbing;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 15;
}

.note-event:hover {
  transform: translateX(-50%) scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.fret-number {
  display: block;
}

.info {
  padding: 15px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  gap: 30px;
  justify-content: center;
  text-align: center;
}

.info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.info strong {
  color: #333;
}
</style>
