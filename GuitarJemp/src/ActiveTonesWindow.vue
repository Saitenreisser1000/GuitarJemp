<template>
  <div class="active-tones-window">
    <h2>Aktive Noten</h2>
    <div class="tones-list">
      <div v-if="activeNotes.length === 0" class="empty-message">
        Keine aktiven Noten
      </div>
      <div v-else>
        <div v-for="note in sortedActiveNotes" :key="note.key" class="tone-item">
          <span class="tone-label">Bund {{ note.fret }}, Saite {{ note.string }}</span>
          <button class="remove-btn" @click="removeNote(note)">✕</button>
        </div>
      </div>
    </div>
    <div class="info">
      <p><strong>Insgesamt:</strong> {{ activeNotes.length }} aktive Note(n)</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ActiveTonesWindow',
  props: {
    activeNotes: {
      type: Array,
      required: true
    }
  },
  computed: {
    sortedActiveNotes() {
      return [...this.activeNotes].sort((a, b) => {
        // primarily by raster position, then by fret/string
        const ga = Number.isFinite(a.gridIndex) ? a.gridIndex : 0
        const gb = Number.isFinite(b.gridIndex) ? b.gridIndex : 0
        if (ga !== gb) return ga - gb
        if (a.fret !== b.fret) return a.fret - b.fret
        return a.string - b.string
      })
    }
  },
  emits: ['remove-note'],
  methods: {
    removeNote(note) {
      this.$emit('remove-note', note.key)
    }
  }
};
</script>

<style scoped>
.active-tones-window {
  padding: 20px;
  border: 2px solid #333;
  border-radius: 4px;
  background-color: #f9f9f9;
  max-width: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 18px;
}

.tones-list {
  margin-bottom: 15px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-color: white;
}

.empty-message {
  padding: 15px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.tone-item {
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s ease;
}

.tone-item:last-child {
  border-bottom: none;
}

.tone-item:hover {
  background-color: #f5f5f5;
}

.tone-label {
  color: #333;
  font-weight: 500;
}

.remove-btn {
  background-color: #d32f2f;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: background-color 0.2s ease;
}

.remove-btn:hover {
  background-color: #b71c1c;
}

.info {
  padding-top: 10px;
  border-top: 1px solid #ddd;
  text-align: center;
}

.info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}
</style>
