<template>
    <div class="timeline-main">
        <PlaybackControls :is-playing="isPlaying" :tempo="tempo" :loop-enabled="loopEnabled" :playhead="playhead"
            :total-duration="totalDuration" @toggle-play="emit('toggle-play')" @seek-start="emit('seek-start')"
            @seek-playhead="(t) => emit('seek-playhead', t)" @update-tempo="(v) => emit('update-tempo', v)"
            @update-loop="(v) => emit('update-loop', v)" />

        <ModeSelector :selected-mode="selectedMode" :snap-enabled="snapEnabled"
            :sound-preview-enabled="soundPreviewEnabled" :beat-top="beatTop" :beat-bottom="beatBottom"
            :zoom-px-per-block="zoomPxPerBlock" @update-zoom="(v) => emit('update-zoom', v)"
            @update-mode="(v) => emit('update-mode', v)" @update-snap="(v) => emit('update-snap', v)"
            @update-sound-preview="(v) => emit('update-sound-preview', v)"
            @update-beat-top="(v) => emit('update-beat-top', v)"
            @update-beat-bottom="(v) => emit('update-beat-bottom', v)" />

        <div class="timeline">
            <div
                ref="scrollEl"
                class="timeline-scroll"
                @pointerdown.capture="onMarqueePointerDown"
                @pointermove.capture="onMarqueePointerMove"
                @pointerup.capture="onMarqueePointerUp"
                @pointercancel.capture="onMarqueePointerUp"
            >
                <div class="timeline-content">
                    <div class="strings-timeline">
                        <TimelineTrack v-for="track in tracks" :key="track.stringIdx" :string="track.stringIdx"
                            :string-label="track.label" :notes="track.notes" :total-duration="totalDuration"
                            :total-blocks="totalBlocks" :playhead="playhead" :snap-enabled="snapEnabled"
                            :step="currentStep" :beat-top="beatTop" :track-min-width-px="trackMinWidthPx"
                            @seek-playhead="(t) => emit('seek-playhead', t)"
                            @update-note-grid-index="(key, gridIndex) => emit('update-note-grid-index', key, gridIndex)"
                            @update-note-length="(key, lengthBlocks) => emit('update-note-length', key, lengthBlocks)"
                            @group-move-notes="(anchorKey, deltaBlocks) => emit('group-move-notes', anchorKey, deltaBlocks)"
                            @group-resize-notes="(anchorKey, deltaBlocks) => emit('group-resize-notes', anchorKey, deltaBlocks)" />
                    </div>

                    <div v-if="marqueeActive" class="marquee" :style="marqueeStyle" />
                </div>
            </div>
        </div>

        <v-card class="timeline-status" variant="flat" border>
            <div class="d-flex align-center ga-3 flex-wrap pa-2">
                <v-chip class="status-chip" label variant="tonal" color="primary">
                    Zeit: {{ playheadTimeLabel }}
                </v-chip>
                <v-chip class="status-chip" label variant="tonal" color="secondary">
                    Takt: {{ barBeatLabel }}
                </v-chip>
            </div>
        </v-card>
    </div>
</template>

<script setup>
import PlaybackControls from './controls/PlaybackControls.vue'
import ModeSelector from './controls/ModeSelector.vue'
import TimelineTrack from './TimelineTrack.vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useSelectionStore } from '@/store/useSelection'

const props = defineProps({
    isPlaying: { type: Boolean, required: true },
    tempo: { type: Number, required: true },

    loopEnabled: { type: Boolean, default: false },

    selectedMode: { type: String, required: true },
    snapEnabled: { type: Boolean, default: true },
    soundPreviewEnabled: { type: Boolean, default: true },
    beatTop: { type: Number, default: 4 },
    beatBottom: { type: Number, default: 4 },

    zoomPxPerBlock: { type: Number, default: 50 },

    totalDuration: { type: Number, required: true },
    totalBlocks: { type: Number, required: true },
    playhead: { type: Number, required: true },
    currentStep: { type: Number, required: true },

    tracks: { type: Array, required: true },
})

const emit = defineEmits([
    'toggle-play',
    'seek-start',
    'update-tempo',
    'update-loop',
    'update-mode',
    'update-snap',
    'update-sound-preview',
    'update-beat-top',
    'update-beat-bottom',
    'update-zoom',
    'seek-playhead',
    'update-note-grid-index',
    'update-note-length',
    'group-move-notes',
    'group-resize-notes',
])

const selection = useSelectionStore()

const scrollEl = ref(null)
const marqueeActive = ref(false)
const marqueeStart = ref({ x: 0, y: 0 })
const marqueeEnd = ref({ x: 0, y: 0 })
let marqueeRaf = 0
let marqueePointerId = null

function toContentCoords(clientX, clientY) {
    const el = scrollEl.value
    if (!el?.getBoundingClientRect) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    return {
        x: clientX - r.left + el.scrollLeft,
        y: clientY - r.top + el.scrollTop,
    }
}

function rectFromPoints(a, b) {
    const left = Math.min(a.x, b.x)
    const top = Math.min(a.y, b.y)
    const right = Math.max(a.x, b.x)
    const bottom = Math.max(a.y, b.y)
    return { left, top, right, bottom, width: right - left, height: bottom - top }
}

const marqueeStyle = computed(() => {
    const r = rectFromPoints(marqueeStart.value, marqueeEnd.value)
    return {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
    }
})

function intersects(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

function updateMarqueeSelection() {
    marqueeRaf = 0
    const el = scrollEl.value
    if (!el?.getBoundingClientRect) return
    const scrollRect = el.getBoundingClientRect()
    const selRect = rectFromPoints(marqueeStart.value, marqueeEnd.value)

    const nodes = el.querySelectorAll?.('.note-event[data-note-key]')
    if (!nodes?.length) {
        selection.setSelectedNotes([])
        return
    }

    const keys = []
    for (const node of nodes) {
        const key = node?.getAttribute?.('data-note-key')
        if (!key) continue
        const nr = node.getBoundingClientRect()
        const noteRect = {
            left: nr.left - scrollRect.left + el.scrollLeft,
            right: nr.right - scrollRect.left + el.scrollLeft,
            top: nr.top - scrollRect.top + el.scrollTop,
            bottom: nr.bottom - scrollRect.top + el.scrollTop,
        }
        if (intersects(selRect, noteRect)) keys.push(key)
    }
    selection.setSelectedNotes(keys)
}

function scheduleMarqueeUpdate() {
    if (marqueeRaf) return
    marqueeRaf = requestAnimationFrame(updateMarqueeSelection)
}

function onMarqueePointerDown(e) {
    // Use Shift+Drag to avoid colliding with existing playhead scrubbing and note drag/resize.
    if (!e?.shiftKey) return
    if (e?.button != null && e.button !== 0) return
    if (e?.target?.closest?.('.note-event')) return

    const el = scrollEl.value
    if (!el) return

    marqueePointerId = e.pointerId
    marqueeActive.value = true

    const p = toContentCoords(e.clientX, e.clientY)
    marqueeStart.value = p
    marqueeEnd.value = p
    selection.setSelectedNotes([])

    el.setPointerCapture?.(e.pointerId)
    e.preventDefault()
    e.stopPropagation()
}

function onMarqueePointerMove(e) {
    if (!marqueeActive.value) return
    if (marqueePointerId != null && e.pointerId !== marqueePointerId) return
    const p = toContentCoords(e.clientX, e.clientY)
    marqueeEnd.value = p
    scheduleMarqueeUpdate()
    e.preventDefault()
    e.stopPropagation()
}

function onMarqueePointerUp(e) {
    if (!marqueeActive.value) return
    if (marqueePointerId != null && e.pointerId !== marqueePointerId) return
    marqueeActive.value = false
    marqueePointerId = null
    if (marqueeRaf) {
        cancelAnimationFrame(marqueeRaf)
        marqueeRaf = 0
        updateMarqueeSelection()
    }
    e?.preventDefault?.()
    e?.stopPropagation?.()
}

onBeforeUnmount(() => {
    if (marqueeRaf) cancelAnimationFrame(marqueeRaf)
})

const trackMinWidthPx = computed(() => {
    const blocks = Math.max(1, Number(props.totalBlocks) || 1)
    const zoom = Math.max(8, Number(props.zoomPxPerBlock) || 50)
    return blocks * zoom
})

const timePerBlockMs = computed(() => {
    const total = Number(props.totalDuration) || 0
    const blocks = Number(props.totalBlocks) || 0
    if (!(total > 0) || !(blocks > 0)) return 0
    return total / blocks
})

function formatMs(tMs) {
    const ms = Math.max(0, Number(tMs) || 0)
    const totalSeconds = ms / 1000
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const hundredths = Math.floor((totalSeconds - Math.floor(totalSeconds)) * 100)

    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    const hh = String(hundredths).padStart(2, '0')
    return `${mm}:${ss}.${hh}`
}

const playheadTimeLabel = computed(() => formatMs(props.playhead))

const barBeatLabel = computed(() => {
    const beatsPerBarRaw = Number.parseInt(String(props.beatTop), 10)
    const beatsPerBar = Number.isFinite(beatsPerBarRaw) && beatsPerBarRaw > 0 ? beatsPerBarRaw : 1

    const tpb = timePerBlockMs.value
    if (!(tpb > 0)) return '1|1'

    const totalBlocks = Math.max(1, Number(props.totalBlocks) || 1)
    const blocksRaw = (Number(props.playhead) || 0) / tpb
    // If we're exactly at the end, show the last bar (not "one past").
    const blocks = Math.min(totalBlocks - 1e-9, Math.max(0, blocksRaw))
    const blockIndex = Math.floor(blocks)
    const bar = Math.floor(blockIndex / beatsPerBar) + 1
    const beat = (blockIndex % beatsPerBar) + 1
    return `${bar}|${beat}`
})
</script>

<style scoped>
.timeline-main {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.timeline {
    position: relative;
    background: white;
    border-radius: 4px;
    border: 1px solid #ddd;
    overflow: hidden;
}

.timeline-scroll {
    overflow-x: auto;
    overflow-y: hidden;
}

.timeline-content {
    display: flex;
    flex-direction: column;
    position: relative;
}

.strings-timeline {
    position: relative;
}

.timeline-status {
    background: #fff;
}

.status-chip {
    width: 200px;
    justify-content: center;
    font-variant-numeric: tabular-nums;
}

.marquee {
    position: absolute;
    border: 2px dashed rgba(102, 126, 234, 0.95);
    background: rgba(102, 126, 234, 0.12);
    border-radius: 6px;
    pointer-events: none;
    z-index: 20;
}
</style>
