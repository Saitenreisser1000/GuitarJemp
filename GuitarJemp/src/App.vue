<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import LayoutManager from '@/components/app/LayoutManager.vue'
import Fretboard from '@/features/fretboard'
import Timeline from '@/features/timeline'
import { TransportBar } from '@/features/transport'
import FretboardContextMenu from '@/features/fretboard/components/FretboardContextMenu.vue'
import { parseMusicXmlToClip } from '@/domain/exchange/importMusicxml'
import { getTuning } from '@/domain/music/tunings'
import { useInstrumentStore } from '@/store/useInstrument'
import { useNotesStore } from '@/store/useNotes'
import { useHandPositionsStore } from '@/store/useHandPositions'
import { useTransportStore } from '@/store/useTransport'
import { useTimelineSettingsStore } from '@/store/useTimelineSettings'

const numFrets = ref(12)
const corePadResizePx = ref(0)
const fretboardMainEl = ref(null)
const timelineRef = ref(null)
const transportVisible = ref(true)
const showFretboard = ref(true)
const showTimeline = ref(true)
const showTransportBar = ref(true)
const RESIZE_MIN = -100
const RESIZE_MAX = 260
let fretboardResizeObserver = null
let fretboardBaseContentHeightPx = 0

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

function updateFretboardResizeFromParentHeight(heightPx) {
  const h = Number(heightPx) || 0
  if (!(h > 0)) return
  const parentEl = fretboardMainEl.value
  const contentEl = parentEl?.querySelector?.('.fretboard-body')
  if (!(fretboardBaseContentHeightPx > 0)) {
    const intrinsic = Number(contentEl?.scrollHeight) || 0
    if (intrinsic > 0) fretboardBaseContentHeightPx = intrinsic
  }
  if (!(fretboardBaseContentHeightPx > 0)) {
    corePadResizePx.value = 0
    return
  }
  const raw = Math.round(h - fretboardBaseContentHeightPx)
  corePadResizePx.value = Math.max(RESIZE_MIN, Math.min(RESIZE_MAX, raw))
}

const fretboardStyleVars = computed(() => ({
  '--fb-core-resize-pad-bottom': `${Math.max(0, Number(corePadResizePx.value) || 0)}px`,
  '--fb-core-resize-margin-bottom': `${Math.min(0, Number(corePadResizePx.value) || 0)}px`,
}))

const timelineIsPlaying = computed(() => Boolean(timelineRef.value?.isPlaying))
const timelinePlayhead = computed(() => Number(timelineRef.value?.playhead) || 0)
const timelineTotalDuration = computed(() => Number(timelineRef.value?.totalDuration) || 0)
const timelinePracticeActive = computed(() => Boolean(timelineRef.value?.practiceActive))
const timelinePracticeAvailable = computed(() => Boolean(timelineRef.value?.practiceAvailable))
const timelinePracticeTargetLabel = computed(() => String(timelineRef.value?.practiceTargetLabel || ''))
const timelinePracticeDetectedLabel = computed(() => String(timelineRef.value?.practiceDetectedLabel || ''))
const timelinePracticeHintText = computed(() => String(timelineRef.value?.practiceHintText || ''))
const timelinePracticeMatchState = computed(() => String(timelineRef.value?.practiceMatchState || ''))
const timelineRecordActive = computed(() => Boolean(timelineRef.value?.recordActive))

function timelineTogglePlay() {
  timelineRef.value?.togglePlay?.()
}

function timelineSeekStart() {
  timelineRef.value?.seekStart?.()
}

function timelineSeekPlayhead(v) {
  timelineRef.value?.seekPlayhead?.(v)
}

function timelineTogglePractice() {
  timelineRef.value?.togglePractice?.()
}

function timelineToggleRecord() {
  timelineRef.value?.toggleRecord?.()
}

onMounted(async () => {
  try {
    await loadStartupMusicXml()
  } catch (err) {
    console.warn('[startup-import] Could not load ballad-picking sample:', err)
  }
  await nextTick()
  const el = fretboardMainEl.value
  if (!el || typeof ResizeObserver === 'undefined') return
  updateFretboardResizeFromParentHeight(el.getBoundingClientRect().height)
  fretboardResizeObserver = new ResizeObserver((entries) => {
    const entry = entries?.[0]
    const h = Number(entry?.contentRect?.height) || 0
    updateFretboardResizeFromParentHeight(h)
  })
  fretboardResizeObserver.observe(el)
})

onBeforeUnmount(() => {
  fretboardResizeObserver?.disconnect?.()
  fretboardResizeObserver = null
})
</script>

<template>
  <div class="app-layout">
    <header class="app-topbar">
      <div class="app-topbar-title">GuitarJemp</div>
    </header>
    <div class="app-menu-bar" aria-label="Main menu">
      <v-btn variant="text" size="small" class="app-menu-btn">File</v-btn>
      <v-btn variant="text" size="small" class="app-menu-btn">Edit</v-btn>
      <v-btn variant="text" size="small" class="app-menu-btn">View</v-btn>
      <v-btn variant="text" size="small" class="app-menu-btn">Window</v-btn>
      <v-btn variant="text" size="small" class="app-menu-btn">Language</v-btn>
      <v-btn variant="text" size="small" class="app-menu-btn">Help</v-btn>
    </div>

    <main class="app-content">
      <LayoutManager class="app-window-manager">
        <template #pane-a>
          <div v-if="showFretboard" ref="fretboardMainEl" class="fretboard-main">
            <Fretboard :num-frets="numFrets" :editable="true" :core-resize-px="corePadResizePx" :style="fretboardStyleVars" />
          </div>
        </template>
        <template #pane-b>
          <Timeline v-if="showTimeline" ref="timelineRef" :num-frets="numFrets" :library-panel-visible="false"
            :transport-visible="transportVisible"
            @update-transport-visible="(v) => (transportVisible = Boolean(v))" />
        </template>
        <template #sidebar>
          <div class="app-sidebar-title">Fretboard Context</div>
          <FretboardContextMenu />
        </template>
      </LayoutManager>
    </main>
    <TransportBar v-if="showTransportBar" :visible="transportVisible" :is-playing="timelineIsPlaying" :tempo="transport.tempo"
      :click-enabled="timelineSettings.clickEnabled" :count-in-enabled="timelineSettings.countInEnabled"
      :auto-follow-enabled="timelineSettings.autoFollowEnabled" :loop-enabled="timelineSettings.loopEnabled"
      :playhead="timelinePlayhead" :total-duration="timelineTotalDuration"
      :practice-active="timelinePracticeActive" :practice-available="timelinePracticeAvailable"
      :practice-target-label="timelinePracticeTargetLabel" :practice-detected-label="timelinePracticeDetectedLabel"
      :practice-hint-text="timelinePracticeHintText" :practice-match-state="timelinePracticeMatchState"
      :record-active="timelineRecordActive" @toggle-play="timelineTogglePlay" @seek-start="timelineSeekStart"
      @seek-playhead="timelineSeekPlayhead" @update-tempo="transport.setTempo"
      @update-click="timelineSettings.setClickEnabled" @update-count-in-enabled="timelineSettings.setCountInEnabled"
      @update-auto-follow="timelineSettings.setAutoFollowEnabled" @update-loop="timelineSettings.setLoopEnabled"
      @toggle-practice="timelineTogglePractice" @toggle-record="timelineToggleRecord" />

    <footer class="app-footer">
      <span>GuitarJemp Workspace</span>
    </footer>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
}

.app-footer {
  display: flex;
  align-items: center;
  height: 44px;
  padding: 0 14px;
  background: #111;
  color: #f3f3f3;
}

.app-topbar {
  display: flex;
  align-items: center;
  min-height: 42px;
  padding-inline: 12px;
  border-bottom: 1px solid #2f2f2f;
  background: #111;
  color: #f3f3f3;
}

.app-topbar-title {
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 0.02em;
  font-family: var(--font-display);
}

.app-menu-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 30px;
  padding: 0 8px;
  border-bottom: 1px solid #c8c8c8;
  background: #efefef;
}

.app-menu-btn {
  min-width: auto;
  padding-inline: 8px;
  text-transform: none;
  font-size: 12px;
  font-weight: 600;
}

.app-menu-btn:hover {
  background: rgb(0 0 0 / 6%);
}

.app-footer {
  border-top: 1px solid #2f2f2f;
}

.app-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.app-window-manager {
  flex: 1 1 auto;
  min-height: 0;
}

.app-sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: #333;
}

.app-layout :deep(.timeline-main) {
  margin-top: 0;
  flex: 1 1 auto;
  min-height: 0;
}

.fretboard-main {
  position: relative;
  display: flex;
  align-items: flex-start;
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
  width: 100%;
  overflow-x: auto;
  overflow-y: visible;
}

.fretboard-main :deep(.fretboard-body) {
  width: 100%;
}
</style>
