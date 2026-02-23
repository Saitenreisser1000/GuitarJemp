<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Fretboard from '@/features/fretboard'
import Timeline from '@/features/timeline'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { getTuning } from '@/domain/music/tunings'
import { useInstrumentStore } from '@/store/useInstrument'
import { useNotesStore } from '@/store/useNotes'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

const numFrets = ref(12)
const corePadResizePx = ref(0)
let resizeStartY = 0
let resizeStartPad = 0
let isResizing = false
let isResizeSnappedToDefault = false
const RESIZE_MIN = -100
const RESIZE_MAX = 260
const RESIZE_SNAP_ENTER_PX = 10
const RESIZE_SNAP_RELEASE_PX = 18

const instrument = useInstrumentStore()
const notes = useNotesStore()
const handPositions = useHandPositionsStore()
const transport = useTransportStore()
const timelineSettings = useTimelineSettingsStore()

async function loadStartupMusicXml() {
  const tuning = getTuning(instrument.tuningId)
  const openMidi = Array.isArray(tuning?.openMidi) ? tuning.openMidi : []
  const response = await fetch('/samples/ballad-picking-study.musicxml', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Failed to load sample (${response.status})`)
  const xml = await response.text()
  const clip = parseMusicXmlToClip(xml, { openMidi, maxFret: Number(numFrets.value) || 24 })

  notes.setNotes(Array.isArray(clip?.notes) ? clip.notes : [])
  handPositions.setHandPositions([])
  transport.setPlayheadMs(0)
  transport.setPlayState('stopped')

  if (Number.isFinite(Number(clip?.tempo))) transport.setTempo(Number(clip.tempo))
  if (Number.isFinite(Number(clip?.beatTop))) timelineSettings.setBeatTop(Number(clip.beatTop))
  if (Number.isFinite(Number(clip?.beatBottom)))
    timelineSettings.setBeatBottom(Number(clip.beatBottom))
}

function onResizeMove(event) {
  if (!isResizing) return
  const dy = (Number(event?.clientY) || 0) - resizeStartY
  const raw = Math.max(RESIZE_MIN, Math.min(RESIZE_MAX, Math.round(resizeStartPad + dy)))
  if (isResizeSnappedToDefault) {
    if (Math.abs(raw) <= RESIZE_SNAP_RELEASE_PX) {
      corePadResizePx.value = 0
      return
    }
    isResizeSnappedToDefault = false
  }
  if (Math.abs(raw) <= RESIZE_SNAP_ENTER_PX) {
    corePadResizePx.value = 0
    isResizeSnappedToDefault = true
    return
  }
  corePadResizePx.value = raw
}

function stopResize() {
  isResizing = false
  isResizeSnappedToDefault = false
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
}

function onResizeStart(event) {
  if (event.button !== 0) return
  event.preventDefault()
  isResizing = true
  isResizeSnappedToDefault = Number(corePadResizePx.value) === 0
  resizeStartY = Number(event.clientY) || 0
  resizeStartPad = Number(corePadResizePx.value) || 0
  window.addEventListener('pointermove', onResizeMove, { passive: false })
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
}

const fretboardStyleVars = computed(() => ({
  '--fb-core-resize-pad-bottom': `${Math.max(0, Number(corePadResizePx.value) || 0)}px`,
  '--fb-core-resize-margin-bottom': `${Math.min(0, Number(corePadResizePx.value) || 0)}px`,
}))

onMounted(async () => {
  try {
    await loadStartupMusicXml()
  } catch (err) {
    console.warn('[startup-import] Could not load ballad-picking sample:', err)
  }
})

onBeforeUnmount(() => {
  stopResize()
})
</script>

<template>
  <div class="app-layout">
    <div class="fretboard-root">
      <Fretboard :num-frets="numFrets" :editable="true" :core-resize-px="corePadResizePx" :style="fretboardStyleVars" />
      <button type="button" class="fretboard-root-resize-handle" aria-label="Resize bottom edge"
        @pointerdown="onResizeStart" />
    </div>
    <Timeline :num-frets="numFrets" :library-panel-visible="false" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fretboard-root {
  position: relative;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

.fretboard-root-resize-handle {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 6px;
  border: 0;
  padding: 0;
  background: #8a8a8a;
  cursor: ns-resize;
  touch-action: none;
}
</style>
