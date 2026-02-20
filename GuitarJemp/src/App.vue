<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Timeline from '@/features/timeline'
import Fretboard from '@/features/fretboard'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { getTuning } from '@/domain/music/tunings'
import { useInstrumentStore } from '@/store/useInstrument'
import { useNotesStore } from '@/store/useNotes'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

const numFrets = ref(12)
const activeNotesVisible = ref(false)
const fretboardVisible = ref(true)
const chordMenuVisible = ref(false)
const timelineVisible = ref(true)
const libraryPanelVisible = ref(false)
const externalUndoTick = ref(0)
const externalRedoTick = ref(0)

const instrument = useInstrumentStore()
const notes = useNotesStore()
const handPositions = useHandPositionsStore()
const transport = useTransportStore()
const timelineSettings = useTimelineSettingsStore()

const TOP_SAFE_OFFSET_PX = 88
const BOTTOM_SAFE_OFFSET_PX = 0
const MIN_TIMELINE_HEIGHT_PX = 180
const MIN_FRETBOARD_HEIGHT_PX = 220
// Change to false later to place fretboard above timeline.
const timelineOnTop = ref(true)
const splitTopHeightPx = ref(420)

let resizePointerId = null
let resizeStartY = 0
let resizeStartSplitTopHeight = 0

function getAvailablePanelHeightPx() {
  const viewportHeight = window.innerHeight || 0
  return Math.max(0, viewportHeight - TOP_SAFE_OFFSET_PX - BOTTOM_SAFE_OFFSET_PX)
}

function splitBoundsPx() {
  const minTop = timelineOnTop.value ? MIN_TIMELINE_HEIGHT_PX : MIN_FRETBOARD_HEIGHT_PX
  const minBottom = timelineOnTop.value ? MIN_FRETBOARD_HEIGHT_PX : MIN_TIMELINE_HEIGHT_PX
  const available = Math.max(minTop + minBottom, getAvailablePanelHeightPx())
  const maxTop = Math.max(minTop, available - minBottom)
  return { minTop, maxTop, available }
}

function clampSplitTopHeightPx(nextHeight) {
  const { minTop, maxTop } = splitBoundsPx()
  const safe = Number(nextHeight)
  if (!Number.isFinite(safe)) return minTop
  return Math.max(minTop, Math.min(maxTop, Math.round(safe)))
}

const splitLayout = computed(() => {
  const hasTimeline = Boolean(timelineVisible.value)
  const hasFretboard = Boolean(fretboardVisible.value)
  const available = getAvailablePanelHeightPx()

  if (hasTimeline && hasFretboard) {
    const topHeight = clampSplitTopHeightPx(splitTopHeightPx.value)
    const bottomHeight = Math.max(0, splitBoundsPx().available - topHeight)
    const timelineHeight = timelineOnTop.value ? topHeight : bottomHeight
    const fretboardHeight = timelineOnTop.value ? bottomHeight : topHeight
    const timelineTop = TOP_SAFE_OFFSET_PX + (timelineOnTop.value ? 0 : topHeight)
    const fretboardTop = TOP_SAFE_OFFSET_PX + (timelineOnTop.value ? topHeight : 0)

    return {
      hasTimeline,
      hasFretboard,
      timelineTop,
      timelineHeight,
      fretboardTop,
      fretboardHeight,
      splitHandleTop: TOP_SAFE_OFFSET_PX + topHeight - 6,
      showSplitHandle: true,
    }
  }

  if (hasTimeline) {
    return {
      hasTimeline,
      hasFretboard,
      timelineTop: TOP_SAFE_OFFSET_PX,
      timelineHeight: available,
      fretboardTop: TOP_SAFE_OFFSET_PX,
      fretboardHeight: 0,
      splitHandleTop: TOP_SAFE_OFFSET_PX,
      showSplitHandle: false,
    }
  }

  return {
    hasTimeline,
    hasFretboard,
    timelineTop: TOP_SAFE_OFFSET_PX,
    timelineHeight: 0,
    fretboardTop: TOP_SAFE_OFFSET_PX,
    fretboardHeight: available,
    splitHandleTop: TOP_SAFE_OFFSET_PX,
    showSplitHandle: false,
  }
})

const timelinePanelStyle = computed(() => ({
  top: `${splitLayout.value.timelineTop}px`,
  height: `${splitLayout.value.timelineHeight}px`,
}))

const fretboardCardStyle = computed(() => ({
  top: `${splitLayout.value.fretboardTop}px`,
  height: `${splitLayout.value.fretboardHeight}px`,
  '--fretboard-layout-h': `${splitLayout.value.fretboardHeight}px`,
}))

const splitHandleStyle = computed(() => ({
  top: `${splitLayout.value.splitHandleTop}px`,
}))

function onWindowResize() {
  splitTopHeightPx.value = clampSplitTopHeightPx(splitTopHeightPx.value)
}

function onResizePointerMove(event) {
  if (resizePointerId !== event.pointerId) return
  const delta = (Number(event.clientY) || 0) - resizeStartY
  splitTopHeightPx.value = clampSplitTopHeightPx(resizeStartSplitTopHeight + delta)
}

function stopResize() {
  resizePointerId = null
  window.removeEventListener('pointermove', onResizePointerMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
}

function onResizePointerDown(event) {
  if (!splitLayout.value.showSplitHandle) return
  if (event.button !== 0) return
  event.preventDefault()
  resizePointerId = event.pointerId
  resizeStartY = event.clientY
  resizeStartSplitTopHeight = clampSplitTopHeightPx(splitTopHeightPx.value)
  window.addEventListener('pointermove', onResizePointerMove, { passive: false })
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
}

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
  if (Number.isFinite(Number(clip?.beatBottom))) timelineSettings.setBeatBottom(Number(clip.beatBottom))
}

onMounted(async () => {
  splitTopHeightPx.value = clampSplitTopHeightPx(Math.round(getAvailablePanelHeightPx() / 2))
  window.addEventListener('resize', onWindowResize)
  try {
    await loadStartupMusicXml()
  } catch (err) {
    console.warn('[startup-import] Could not load ballad-picking sample:', err)
  }
})

onBeforeUnmount(() => {
  stopResize()
  window.removeEventListener('resize', onWindowResize)
})

function onUpdateFrets(v) {
  numFrets.value = Number(v) || 12
}

function onUpdateActiveNotesVisible(v) {
  activeNotesVisible.value = Boolean(v)
}

function onUpdateFretboardVisible(v) {
  fretboardVisible.value = Boolean(v)
}

function onUpdateChordMenuVisible(v) {
  chordMenuVisible.value = Boolean(v)
}

function onUpdateTimelineVisible(v) {
  timelineVisible.value = Boolean(v)
}

function onUpdateLibraryPanelVisible(v) {
  libraryPanelVisible.value = Boolean(v)
}
</script>

<template>
  <v-app class="minimal-shell">
    <v-main>
      <section v-if="splitLayout.hasTimeline" class="timeline-panel" :style="timelinePanelStyle">
        <Timeline
          :num-frets="numFrets"
          :active-notes-visible="activeNotesVisible"
          :fretboard-visible="fretboardVisible"
          :chord-menu-visible="chordMenuVisible"
          :timeline-visible="timelineVisible"
          :transport-visible="false"
          :library-panel-visible="libraryPanelVisible"
          :external-undo-tick="externalUndoTick"
          :external-redo-tick="externalRedoTick"
          :library-enabled="false"
          @update-frets="onUpdateFrets"
          @update-active-notes-visible="onUpdateActiveNotesVisible"
          @update-fretboard-visible="onUpdateFretboardVisible"
          @update-chord-menu-visible="onUpdateChordMenuVisible"
          @update-timeline-visible="onUpdateTimelineVisible"
          @update-library-panel-visible="onUpdateLibraryPanelVisible"
        />
      </section>

      <button
        v-if="splitLayout.showSplitHandle"
        class="split-resize-handle"
        type="button"
        aria-label="Resize timeline and fretboard"
        :style="splitHandleStyle"
        @pointerdown="onResizePointerDown"
      />

      <div id="transport-host" class="transport-host" />

      <v-card
        v-if="splitLayout.hasFretboard"
        class="fretboard-card"
        :style="fretboardCardStyle"
        variant="flat"
      >
        <div class="fretboard-card-layout">
          <div class="fretboard-inner">
            <Fretboard class="fretboard" :num-frets="numFrets" :editable="true" />
          </div>
        </div>
      </v-card>
    </v-main>
  </v-app>
</template>

<style scoped>
.minimal-shell {
  min-height: 100vh;
}

.timeline-panel {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 20;
  overflow: hidden;
}

.fretboard-card {
  position: fixed;
  left: 0;
  right: 0;
  bottom: auto;
  width: auto;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
  z-index: 30;
}

.transport-host {
  position: fixed;
  left: var(--fixed-panel-left, calc(var(--main-menu-w, 84px) + var(--space-4)));
  right: var(--fixed-panel-right, calc(var(--main-menu-w, 84px) + var(--space-4)));
  top: var(--space-4);
  z-index: 35;
  pointer-events: none;
}

@media (max-width: 860px) {
  .transport-host {
    left: var(--fixed-panel-left, var(--space-2));
    right: var(--fixed-panel-right, var(--space-2));
    top: var(--space-2);
  }
}

.fretboard-card-layout {
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: flex-start;
  height: 100%;
  width: 100%;
  min-width: 0;
}

.fretboard-inner {
  --fretboard-aspect: calc(1100 / 180);
  --fretboard-reserved-h: 140px;
  min-width: 0;
  width: min(100%, calc((var(--fretboard-layout-h, 420px) - var(--fretboard-reserved-h)) * var(--fretboard-aspect)));
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  padding-top: 16px;
}

.fretboard {
  width: 100%;
  margin-top: 0;
  margin-right: 0;
  border-radius: var(--radius-lg);
  overflow: visible;
}

.split-resize-handle {
  position: fixed;
  left: 0;
  right: 0;
  width: 100%;
  height: 12px;
  margin: 0;
  border: 0;
  z-index: 40;
  background: repeating-linear-gradient(
    to right,
    rgba(0, 0, 0, 0.35) 0,
    rgba(0, 0, 0, 0.35) 14px,
    transparent 14px,
    transparent 20px
  );
  cursor: ns-resize;
  touch-action: none;
}
</style>
