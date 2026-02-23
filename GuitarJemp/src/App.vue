<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Fretboard from '@/features/fretboard'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { getTuning } from '@/domain/music/tunings'
import { useInstrumentStore } from '@/store/useInstrument'
import { useNotesStore } from '@/store/useNotes'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

const numFrets = ref(12)
const wrapEl = ref(null)
const cardRect = ref({ x: 0, y: 0, width: 1200, height: 460 })

const MIN_CARD_WIDTH = 640
const MIN_CARD_HEIGHT = 320
const CARD_PADDING = 20

let activeResizeEdge = null
let resizeStartPointerX = 0
let resizeStartPointerY = 0
let resizeStartRect = { x: 0, y: 0, width: 0, height: 0 }

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

function clampCardRect(next) {
  const wrap = wrapEl.value
  if (!wrap) return next
  const wrapWidth = Math.max(1, wrap.clientWidth)
  const wrapHeight = Math.max(1, wrap.clientHeight)

  let width = Math.min(Math.max(MIN_CARD_WIDTH, Number(next.width) || MIN_CARD_WIDTH), wrapWidth)
  let height = Math.min(
    Math.max(MIN_CARD_HEIGHT, Number(next.height) || MIN_CARD_HEIGHT),
    wrapHeight,
  )

  let x = Number(next.x) || 0
  let y = Number(next.y) || 0

  x = Math.max(0, Math.min(x, wrapWidth - width))
  y = Math.max(0, Math.min(y, wrapHeight - height))

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  }
}

function centerCardInWrap() {
  const wrap = wrapEl.value
  if (!wrap) return
  const width = Math.min(1460, Math.max(MIN_CARD_WIDTH, wrap.clientWidth - CARD_PADDING * 2))
  const height = Math.min(560, Math.max(MIN_CARD_HEIGHT, wrap.clientHeight - CARD_PADDING * 2))
  const x = Math.max(0, (wrap.clientWidth - width) / 2)
  const y = Math.max(0, (wrap.clientHeight - height) / 2)
  cardRect.value = clampCardRect({ x, y, width, height })
}

function onWindowResize() {
  cardRect.value = clampCardRect(cardRect.value)
}

function onResizeMove(event) {
  if (!activeResizeEdge) return
  const dx = (Number(event.clientX) || 0) - resizeStartPointerX
  const dy = (Number(event.clientY) || 0) - resizeStartPointerY
  const next = { ...resizeStartRect }

  if (activeResizeEdge === 'right') next.width = resizeStartRect.width + dx
  if (activeResizeEdge === 'left') {
    next.x = resizeStartRect.x + dx
    next.width = resizeStartRect.width - dx
  }
  if (activeResizeEdge === 'bottom') next.height = resizeStartRect.height + dy
  if (activeResizeEdge === 'top') {
    next.y = resizeStartRect.y + dy
    next.height = resizeStartRect.height - dy
  }

  cardRect.value = clampCardRect(next)
}

function stopResize() {
  activeResizeEdge = null
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
}

function onResizeStart(edge, event) {
  if (event.button !== 0) return
  event.preventDefault()
  activeResizeEdge = edge
  resizeStartPointerX = Number(event.clientX) || 0
  resizeStartPointerY = Number(event.clientY) || 0
  resizeStartRect = { ...cardRect.value }
  window.addEventListener('pointermove', onResizeMove, { passive: false })
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
}

const fretboardCardStyle = computed(() => ({
  left: `${cardRect.value.x}px`,
  top: `${cardRect.value.y}px`,
  width: `${cardRect.value.width}px`,
  height: `${cardRect.value.height}px`,
}))

onMounted(async () => {
  await nextTick()
  centerCardInWrap()
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
</script>

<template>
  <v-app class="minimal-shell">
    <v-main class="fretboard-only-main">
      <div ref="wrapEl" class="fretboard-only-wrap">
        <div class="fretboard-card-shell" :style="fretboardCardStyle">
          <v-card class="fretboard-card" variant="flat">
            <Fretboard class="fretboard" :num-frets="numFrets" :editable="true" />
          </v-card>
          <div id="fretboard-actions-host" class="fretboard-actions-host" />
          <button type="button" class="resize-handle resize-handle-top" aria-label="Resize top edge"
            @pointerdown="(event) => onResizeStart('top', event)" />
          <button type="button" class="resize-handle resize-handle-right" aria-label="Resize right edge"
            @pointerdown="(event) => onResizeStart('right', event)" />
          <button type="button" class="resize-handle resize-handle-bottom" aria-label="Resize bottom edge"
            @pointerdown="(event) => onResizeStart('bottom', event)" />
          <button type="button" class="resize-handle resize-handle-left" aria-label="Resize left edge"
            @pointerdown="(event) => onResizeStart('left', event)" />
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.minimal-shell {
  min-height: 100vh;
}

.fretboard-only-main {
  background: #fff;
}

.fretboard-only-wrap {
  height: 66.67vh;
  width: 100%;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
}

.fretboard-card-shell {
  position: absolute;
}

.fretboard-card {
  width: 100%;
  height: 100%;
  padding: 28px 28px 28px 48px;
  border: 1px solid #d4d4d4;
  border-radius: 0;
  background: #f4f4f4;
  box-shadow: none;
  overflow: visible;
}

.fretboard {
  width: 100%;
  border-radius: 0;
  overflow: visible;
}

.fretboard-actions-host {
  margin-top: 12px;
}

.fretboard :deep(.fretboard-js) {
  padding-bottom: 10px;
}

.resize-handle {
  position: absolute;
  border: 0;
  background: #8a8a8a;
  z-index: 5;
  padding: 0;
}

.resize-handle-top,
.resize-handle-bottom {
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle-top {
  top: -3px;
}

.resize-handle-bottom {
  bottom: -3px;
}

.resize-handle-left,
.resize-handle-right {
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
}

.resize-handle-left {
  left: -3px;
}

.resize-handle-right {
  right: -3px;
}
</style>
