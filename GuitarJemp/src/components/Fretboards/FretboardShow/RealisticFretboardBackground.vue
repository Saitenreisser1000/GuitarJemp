<template>
    <svg class="fb-realistic" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
        <defs>
            <linearGradient id="wood" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#5a3a1e" />
                <stop offset="0.25" stop-color="#6a4222" />
                <stop offset="0.55" stop-color="#4f311a" />
                <stop offset="0.85" stop-color="#6a4222" />
                <stop offset="1" stop-color="#4a2d17" />
            </linearGradient>

            <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="rgba(255,255,255,0.16)" />
                <stop offset="0.35" stop-color="rgba(255,255,255,0)" />
                <stop offset="0.72" stop-color="rgba(0,0,0,0.18)" />
                <stop offset="1" stop-color="rgba(0,0,0,0.32)" />
            </linearGradient>

            <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
                <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.18 0" />
                <feComposite operator="in" in2="SourceGraphic" />
            </filter>

            <linearGradient id="metal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#f2f2f2" />
                <stop offset="0.45" stop-color="#bdbdbd" />
                <stop offset="1" stop-color="#f7f7f7" />
            </linearGradient>

            <radialGradient id="inlay" cx="50%" cy="40%" r="60%">
                <stop offset="0" stop-color="rgba(255,255,255,0.65)" />
                <stop offset="1" stop-color="rgba(255,255,255,0.18)" />
            </radialGradient>
        </defs>

        <!-- Board -->
        <rect :x="0" :y="boardY" :width="W" :height="boardH" rx="0" fill="url(#wood)" />
        <rect :x="0" :y="boardY" :width="W" :height="boardH" rx="0" fill="url(#shade)" />
        <rect :x="0" :y="boardY" :width="W" :height="boardH" rx="0" fill="transparent" filter="url(#grain)"
            opacity="0.9" />

        <!-- Slight edge vignette -->
        <rect :x="4" :y="boardY + 4" :width="W - 8" :height="boardH - 8" rx="0" fill="transparent"
            stroke="rgba(0,0,0,0.28)" stroke-width="2" />

        <!-- Nut (visual) -->
        <rect :x="0" :y="boardY" :width="nutWidth" :height="boardH" fill="rgba(245,245,245,0.92)" opacity="0.95" />
        <!-- Nut shadow for more depth -->
        <rect :x="nutWidth" :y="boardY" width="3" :height="boardH" fill="rgba(0,0,0,0.18)" opacity="0.9" />

        <!-- Inlays (3,5,7,9,12,15,17,19,21,24) -->
        <g class="inlays" opacity="0.95">
            <template v-for="dot in inlayDots" :key="dot.key">
                <circle :cx="dot.x" :cy="dot.y" :r="dot.r" fill="url(#inlay)" />
                <circle :cx="dot.x" :cy="dot.y" :r="dot.r" fill="transparent" stroke="rgba(0,0,0,0.22)"
                    stroke-width="1" />
            </template>
        </g>

        <!-- Strings -->
        <g class="strings" opacity="0.9">
            <line v-for="(s, i) in strings" :key="`string-${i}`" :x1="-STRING_OVERHANG" :y1="s.y"
                :x2="W + STRING_OVERHANG" :y2="s.y" stroke="rgba(240,240,240,0.82)" :stroke-width="s.w"
                stroke-linecap="round" />
            <!-- subtle shadow under strings -->
            <line v-for="(s, i) in strings" :key="`string-shadow-${i}`" :x1="-STRING_OVERHANG" :y1="s.y + 0.9"
                :x2="W + STRING_OVERHANG" :y2="s.y + 0.9" stroke="rgba(0,0,0,0.14)"
                :stroke-width="Math.max(1, s.w - 0.6)" stroke-linecap="round" />
        </g>

        <!-- Frets (render on top for visibility) -->
        <g class="frets">
            <template v-for="(x, i) in fretLinesPx" :key="`fret-${i}`">
                <!-- Nut line is handled separately as a rect; keep a subtle edge line here -->
                <line v-if="i === 0" :x1="x + nutWidth" :y1="boardY" :x2="x + nutWidth" :y2="boardY + boardH"
                    stroke="rgba(0,0,0,0.28)" stroke-width="2" opacity="0.9" />

                <!-- 3D fret: highlight + metal core + shadow -->
                <line v-else :x1="x - 0.9" :y1="boardY" :x2="x - 0.9" :y2="boardY + boardH"
                    stroke="rgba(255,255,255,0.33)" :stroke-width="i === 12 ? 1.6 : 1.3" opacity="0.95" />
                <line v-if="i !== 0" :x1="x" :y1="boardY" :x2="x" :y2="boardY + boardH" stroke="url(#metal)"
                    :stroke-width="i === 12 ? 3.2 : 2.6" opacity="0.95" />
                <line v-if="i !== 0" :x1="x + 1.1" :y1="boardY" :x2="x + 1.1" :y2="boardY + boardH"
                    stroke="rgba(0,0,0,0.28)" :stroke-width="i === 12 ? 1.7 : 1.4" opacity="0.95" />
            </template>
        </g>
    </svg>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'RealisticFretboardBackground' })

const props = defineProps({
    fretCount: { type: Number, required: true },
    stringCount: { type: Number, required: true },
    width: { type: Number, default: 1100 },
    height: { type: Number, default: 180 },
    nutWidth: { type: Number, default: 7 },
    scaleFrets: { type: Boolean, default: true },
})

const W = computed(() => Math.max(200, Number(props.width) || 1100))
const H = computed(() => Math.max(80, Number(props.height) || 180))
const nutWidth = computed(() => Math.max(2, Number(props.nutWidth) || 7))

// Visual-only extra height of the fretboard wood above/below the strings.
// Strings & dots stay in the original 0..H coordinate space.
const OVERHANG = 18
const boardY = computed(() => -OVERHANG)
const boardH = computed(() => H.value + OVERHANG * 2)

const STRING_OVERHANG = 22

function generateFretsPercent({ fretCount, scaleFrets }) {
    const n = Math.max(1, Number(fretCount) || 1)
    const fretRatio = Math.pow(2, 1 / 12)
    const frets = [0]
    for (let i = 1; i <= n; i++) {
        let x = (100 / n) * i
        if (scaleFrets) x = 100 - 100 / Math.pow(fretRatio, i)
        frets.push(x)
    }
    const last = frets[frets.length - 1] || 100
    return frets.map((x) => (x / last) * 100)
}

const fretsPct = computed(() =>
    generateFretsPercent({ fretCount: props.fretCount, scaleFrets: props.scaleFrets }),
)

const fretLinesPx = computed(() => fretsPct.value.map((p) => (p / 100) * W.value))

const strings = computed(() => {
    const count = Math.max(2, Number(props.stringCount) || 6)

    const res = []
    for (let i = 0; i < count; i++) {
        // Visual convention: top string thin, bottom string thick.
        // Keep center positions stable (do not shift y based on stroke width).
        const t = i / Math.max(1, count - 1) // 0..1
        const w = 1.2 + t * 1.6

        const y = (H.value / (count - 1)) * i

        res.push({ y, w })
    }

    return res
})

function dotMidXForFret(fret) {
    const f = Math.max(0, Math.min(Number(fret) || 0, fretsPct.value.length - 1))
    if (f === 0) return 0
    const a = fretsPct.value[f - 1] ?? 0
    const b = fretsPct.value[f] ?? 0
    const mid = b - (b - a) / 2
    return (mid / 100) * W.value
}

const inlayDots = computed(() => {
    const inlays = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24]
    const maxF = Math.max(0, Number(props.fretCount) || 0)
    const inside = inlays.filter((f) => f <= maxF)

    const out = []
    const midY = H.value / 2

    for (const f of inside) {
        const x = dotMidXForFret(f)

        const isDouble = f === 12 || f === 24
        const r = 9

        if (isDouble) {
            out.push({ key: `inlay-${f}-a`, x, y: midY - 22, r })
            out.push({ key: `inlay-${f}-b`, x, y: midY + 22, r })
        } else {
            out.push({ key: `inlay-${f}`, x, y: midY, r })
        }
    }

    return out
})
</script>

<style scoped>
.fb-realistic {
    width: 100%;
    height: 100%;
    display: block;
    overflow: visible;
}
</style>
