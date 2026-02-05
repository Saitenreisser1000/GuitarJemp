let audioCtx

function getAudioContext() {
  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

async function ensureRunning(ctx) {
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      // ignore
    }
  }
}

function safeJsonClone(v) {
  if (v == null) return null
  try {
    return JSON.parse(JSON.stringify(v))
  } catch {
    return null
  }
}

function midiToPlaybackRate(targetMidi, rootMidi) {
  const t = Number(targetMidi)
  const r = Number(rootMidi)
  if (!Number.isFinite(t) || !Number.isFinite(r)) return 1
  return Math.pow(2, (t - r) / 12)
}

function pickNearestSample(samples, targetMidi) {
  const t = Number(targetMidi)
  if (!Number.isFinite(t) || !Array.isArray(samples) || samples.length === 0) return null

  let best = null
  let bestDist = Infinity
  for (const s of samples) {
    const m = Number(s?.midi)
    if (!Number.isFinite(m)) continue
    const d = Math.abs(m - t)
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return best
}

async function fetchJson(url) {
  const cache = import.meta?.env?.DEV ? 'no-store' : 'force-cache'
  const res = await fetch(url, { cache })
  if (!res.ok) throw new Error(`Manifest nicht gefunden (${res.status}): ${url}`)
  return res.json()
}

async function fetchArrayBuffer(url) {
  const cache = import.meta?.env?.DEV ? 'no-store' : 'force-cache'
  const res = await fetch(url, { cache })
  if (!res.ok) throw new Error(`Sample nicht gefunden (${res.status}): ${url}`)
  return res.arrayBuffer()
}

const presetCache = new Map()

async function loadPresetInternal(manifestUrl) {
  const ctx = getAudioContext()
  if (!ctx) throw new Error('WebAudio nicht verfügbar')

  const rawManifest = await fetchJson(manifestUrl)
  const manifest = safeJsonClone(rawManifest) || {}
  const samples = Array.isArray(manifest?.samples) ? manifest.samples : []

  const decoded = []
  for (const s of samples) {
    const midi = Number(s?.midi)
    const url = String(s?.url || '')
    if (!Number.isFinite(midi) || !url) continue
    const ab = await fetchArrayBuffer(url)
    const buffer = await ctx.decodeAudioData(ab)
    decoded.push({ midi, url, buffer })
  }

  if (decoded.length === 0) throw new Error('Keine Samples im Manifest')
  return { manifestUrl, samples: decoded }
}

export function preloadSamplerPreset(manifestUrl) {
  const key = String(manifestUrl || '').trim()
  if (!key) return Promise.reject(new Error('Kein Manifest angegeben'))
  if (presetCache.has(key)) return presetCache.get(key)

  const p = loadPresetInternal(key).catch((err) => {
    // Do not cache a permanently rejected promise; allow retry after fixing files.
    presetCache.delete(key)
    throw err
  })
  presetCache.set(key, p)
  return p
}

export async function playMidiWithSampler(
  manifestUrl,
  midi,
  { durationMs = 250, gain = 0.25 } = {},
) {
  const ctx = getAudioContext()
  if (!ctx) return false
  await ensureRunning(ctx)

  const preset = await preloadSamplerPreset(manifestUrl)
  const sample = pickNearestSample(preset.samples, midi)
  if (!sample?.buffer) return false

  const src = ctx.createBufferSource()
  const g = ctx.createGain()

  src.buffer = sample.buffer
  src.playbackRate.value = midiToPlaybackRate(midi, sample.midi)

  const now = ctx.currentTime
  const dur = Math.max(30, Number(durationMs) || 250) / 1000
  const peak = Math.max(0.0001, Number(gain) || 0.25)

  if (import.meta?.env?.DEV) {
    const rate = Number(src.playbackRate.value) || 1
    const sampleSeconds = Number(sample.buffer?.duration) || 0
    const playableSeconds = rate > 0 ? sampleSeconds / rate : sampleSeconds
    if (sampleSeconds > 0 && dur > playableSeconds + 0.02) {
      console.warn('[audio] Note länger als Sample (kein Sustain/Loop implementiert)', {
        midi,
        rootMidi: sample.midi,
        url: sample.url,
        requestedSeconds: dur,
        playableSeconds,
        sampleSeconds,
        playbackRate: rate,
      })
    }
  }

  // Simple pluck-like envelope.
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(peak, now + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  src.connect(g)
  g.connect(ctx.destination)

  src.start(now)
  src.stop(now + dur + 0.05)
  return true
}
