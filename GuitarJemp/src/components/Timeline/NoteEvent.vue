<template>
  <div class="note-event" :class="{ 'is-selected': isSelected }" :data-note-key="note?.key"
    :style="{ left: leftPercent + '%', width: widthPercent + '%', backgroundColor: color }" :title="title"
    @pointerdown="onPointerDown" @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerUp">
    <div class="note-label">
      <span class="fret-number">{{ note.fret }}</span>
      <span v-if="pitchLabel" class="pitch-label">{{ pitchLabel }}</span>
    </div>
    <div class="resize-handle" @pointerdown.stop="onResizePointerDown" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useSelectionStore } from '@/store/useSelection'
import { useNotesStore } from '@/store/useNotes'
import { useInstrumentStore } from '@/store/useInstrument'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'
import { useTransportStore } from '@/store/useTransport'
import { TIMELINE_SNAP_STEP_BLOCKS } from '@/config/grid'
import { getTuning } from '@/domain/music/tunings'
import { midiToNoteName } from '@/domain/music/notes'
import { midiForNote } from '@/domain/music/pitch'
import { playMidi } from '@/domain/audio/simpleSynth'
import { clampResizeLength } from '@/domain/timelineInteractions'
const props = defineProps({
  note: { type: Object, required: true },
  totalBlocks: { type: Number, default: 16 },
  timePerBlockMs: { type: Number, default: 0 },
  color: String,
  snapEnabled: Boolean,
  step: Number,
})

const emit = defineEmits(['update-grid-index', 'update-length', 'group-move', 'group-resize'])

const selection = useSelectionStore()
const notesStore = useNotesStore()
const instrument = useInstrumentStore()
const settings = useTimelineSettingsStore()
const transport = useTransportStore()
const isSelected = computed(() => selection.isSelected(props.note?.key))
const isGroupSelected = computed(
  () => isSelected.value && (selection.selectedNoteKeys?.length || 0) > 1,
)

const safeLengthBlocks = computed(() => {
  const raw = Number(props.note?.lengthBlocks ?? 1)
  return Number.isFinite(raw) && raw > 0 ? raw : 1
})

function selectForwardFromHere({ allStrings = false } = {}) {
  const key = props.note?.key
  if (!key) return

  const startGridIndex = Number(props.note?.gridIndex)
  const string = Number(props.note?.string)
  if (!Number.isFinite(startGridIndex) || (!allStrings && !Number.isFinite(string))) {
    selection.selectNote(key)
    return
  }

  const candidates = Array.isArray(notesStore.activeNotes) ? notesStore.activeNotes : []
  const laterOrEqual = candidates
    .filter((n) => (allStrings ? true : Number(n?.string) === string))
    .filter((n) => {
      const gi = Number(n?.gridIndex)
      return Number.isFinite(gi) && gi >= startGridIndex
    })

  laterOrEqual.sort((a, b) => {
    const ga = Number(a?.gridIndex) || 0
    const gb = Number(b?.gridIndex) || 0
    if (ga !== gb) return ga - gb
    const ta = Number(a?.placedAtMs) || 0
    const tb = Number(b?.placedAtMs) || 0
    if (ta !== tb) return ta - tb
    return String(a?.key ?? '').localeCompare(String(b?.key ?? ''))
  })

  const keys = laterOrEqual
    .map((n) => n?.key)
    .filter(Boolean)
    .map((k) => String(k))

  // Make clicked note primary by placing it first.
  const clicked = String(key)
  const next = [clicked, ...keys.filter((k) => k !== clicked)]
  selection.setSelectedNotes(next)
}

const pitchLabel = computed(() => {
  const t = getTuning(instrument.tuningId)
  const midi = midiForNote(props.note, t)
  if (!Number.isFinite(Number(midi))) return ''
  return midiToNoteName(midi, { includeOctave: true })
})

const isDragging = ref(false)
const dragGridIndex = ref(null)
const isResizing = ref(false)
const dragLength = ref(null)
let startClientX = 0
let startGridIndex = 1
let cellWidthPx = 0
let startLength = 1

const leftPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const base = Number(props.note?.gridIndex ?? 1)
  const useGroup = isGroupSelected.value && selection.groupDragActive
  const previewDelta =
    isGroupSelected.value && selection.groupDragActive
      ? Number(selection.groupDragDeltaBlocks || 0)
      : 0
  const preview = base + previewDelta
  const gridIndex = useGroup
    ? preview
    : isDragging.value
      ? Number(dragGridIndex.value ?? base)
      : base
  const clamped = Math.min(total, Math.max(1, gridIndex))
  // left edge of the cell: raster 1 => 0%
  return ((clamped - 1) / total) * 100
})

const widthPercent = computed(() => {
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  const baseLen = safeLengthBlocks.value
  const useGroup = isGroupSelected.value && selection.groupResizeActive
  const previewDelta =
    isGroupSelected.value && selection.groupResizeActive
      ? Number(selection.groupResizeDeltaBlocks || 0)
      : 0
  const previewLen = baseLen + previewDelta
  const len = useGroup
    ? previewLen
    : isResizing.value
      ? Number(dragLength.value ?? baseLen)
      : baseLen
  const safeLen = Number.isFinite(len) && len > 0 ? len : 1
  return (safeLen / total) * 100
})

const title = computed(() => {
  const len = safeLengthBlocks.value
  const p = pitchLabel.value
  const pPart = p ? ` (${p})` : ''
  return `Bund ${props.note?.fret}, Saite ${props.note?.string}${pPart}, Raster ${props.note?.gridIndex}, Länge ${len}`
})

function onPointerDown(e) {
  if (isResizing.value) return
  const key = props.note?.key
  // Selection behavior:
  // - Cmd+Option+Shift+click: select this and all following notes (all strings)
  // - Shift+Option+click: select this and all following notes (same string)
  // - Shift+click: toggle add/remove (multi-select)
  // - Normal click: select single note (unless already selected)
  if (key) {
    if (e?.shiftKey && e?.altKey && e?.metaKey) selectForwardFromHere({ allStrings: true })
    else if (e?.shiftKey && e?.altKey) selectForwardFromHere({ allStrings: false })
    else if (e?.shiftKey) selection.toggleNoteInSelection(key)
    else if (!selection.isSelected(key)) selection.selectNote(key)
  }

  if (settings.soundPreviewEnabled) {
    const t = getTuning(instrument.tuningId)
    const midi = midiForNote(props.note, t)
    if (Number.isFinite(Number(midi))) {
      const timePerBlock = Number(props.timePerBlockMs)
      const timePerBlockMs = Number.isFinite(timePerBlock) && timePerBlock > 0 ? timePerBlock : 0

      const lengthBlocksRaw = Number(props.note?.lengthBlocks)
      const lengthBlocks =
        Number.isFinite(lengthBlocksRaw) && lengthBlocksRaw > 0 ? lengthBlocksRaw : 1

      const durationPlayheadMs = timePerBlockMs > 0 ? lengthBlocks * timePerBlockMs : 200

      const tempoValue = Number(transport.tempo) || 120
      const tempoScale = 120 / tempoValue
      const durScale = Number(settings.soundDurationScale)
      const safeScale = Number.isFinite(durScale) && durScale > 0 ? durScale : 1
      const durationAudioMs = Math.max(30, durationPlayheadMs * tempoScale * safeScale)

      void playMidi(midi, {
        durationMs: durationAudioMs,
        instrumentType: instrument.instrumentType,
      })
    }
  }

  const el = e.currentTarget
  const track = el.closest('.timeline-track')
  if (!track) return

  const rect = track.getBoundingClientRect()
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  cellWidthPx = rect.width / total

  startClientX = e.clientX
  startGridIndex = Number(props.note?.gridIndex ?? 1)
  dragGridIndex.value = startGridIndex
  isDragging.value = true

  if (isGroupSelected.value) selection.setGroupDrag(true, 0)

  el.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onResizePointerDown(e) {
  if (isDragging.value) return
  const key = props.note?.key
  if (key) {
    if (e?.shiftKey && e?.altKey && e?.metaKey) selectForwardFromHere({ allStrings: true })
    else if (e?.shiftKey && e?.altKey) selectForwardFromHere({ allStrings: false })
    else if (e?.shiftKey) selection.toggleNoteInSelection(key)
    else if (!selection.isSelected(key)) selection.selectNote(key)
  }
  const handleEl = e.currentTarget
  const noteEl = handleEl?.closest?.('.note-event')
  const track = handleEl.closest('.timeline-track')
  if (!track) return

  const rect = track.getBoundingClientRect()
  const total = Math.max(1, Number(props.totalBlocks) || 1)
  cellWidthPx = rect.width / total

  startClientX = e.clientX
  startGridIndex = Number(props.note?.gridIndex ?? 1)
  startLength = safeLengthBlocks.value
  dragLength.value = startLength
  isResizing.value = true

  if (isGroupSelected.value) selection.setGroupResize(true, 0)

  // capture on this note element
  noteEl?.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

function onPointerMove(e) {
  if (!isDragging.value && !isResizing.value) return
  if (!cellWidthPx) return

  const deltaPx = e.clientX - startClientX
  const total = Math.max(1, Number(props.totalBlocks) || 1)

  if (isDragging.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaQuantized = props.snapEnabled
      ? Math.round(deltaBlocks / TIMELINE_SNAP_STEP_BLOCKS) * TIMELINE_SNAP_STEP_BLOCKS
      : deltaBlocks

    if (isGroupSelected.value) {
      selection.setGroupDrag(true, deltaQuantized)
      return
    }

    const next = startGridIndex + deltaQuantized
    // clamp within visible block range
    dragGridIndex.value = Math.min(total, Math.max(1, next))
    return
  }

  if (isResizing.value) {
    const deltaBlocks = deltaPx / cellWidthPx
    const deltaQuantized = props.snapEnabled
      ? Math.round(deltaBlocks / TIMELINE_SNAP_STEP_BLOCKS) * TIMELINE_SNAP_STEP_BLOCKS
      : deltaBlocks

    if (isGroupSelected.value) {
      selection.setGroupResize(true, deltaQuantized)
      return
    }
    dragLength.value = clampResizeLength({
      startLength,
      deltaBlocks: deltaQuantized,
      startGridIndex,
      totalBlocks: total,
      snapEnabled: props.snapEnabled,
      snapStepBlocks: TIMELINE_SNAP_STEP_BLOCKS,
    })
  }
}

function onPointerUp() {
  if (isDragging.value) {
    isDragging.value = false
    if (isGroupSelected.value) {
      const delta = Number((selection.groupDragDeltaBlocks || 0).toFixed(2))
      selection.setGroupDrag(false, 0)
      dragGridIndex.value = null
      if (props.note?.key && delta) emit('group-move', props.note.key, delta)
    } else {
      const next = Number((dragGridIndex.value ?? startGridIndex).toFixed(2))
      dragGridIndex.value = null
      if (props.note?.key) emit('update-grid-index', props.note.key, next)
    }
  }

  if (isResizing.value) {
    isResizing.value = false
    if (isGroupSelected.value) {
      const delta = Number((selection.groupResizeDeltaBlocks || 0).toFixed(2))
      selection.setGroupResize(false, 0)
      dragLength.value = null
      if (props.note?.key && delta) emit('group-resize', props.note.key, delta)
    } else {
      const nextLen = Number((dragLength.value ?? startLength).toFixed(2))
      dragLength.value = null
      if (props.note?.key) emit('update-length', props.note.key, nextLen)
    }
  }
}
</script>

<style scoped>
.note-event {
  position: absolute;
  height: 100%;
  top: 0;
  border-radius: 4px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.note-label {
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.note-event.is-selected {
  border-color: rgba(20, 20, 20, 0.95);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.65);
  z-index: 6;
}

.note-event:active {
  cursor: grabbing;
}

.pitch-label {
  font-size: 11px;
  opacity: 0.9;
  font-variant-numeric: tabular-nums;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 10px;
  height: 100%;
  cursor: ew-resize;
  background: rgba(255, 255, 255, 0.18);
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}
</style>
