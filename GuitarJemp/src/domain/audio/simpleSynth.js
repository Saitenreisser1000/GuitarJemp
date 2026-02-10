import { getDefaultPresetIdForInstrumentType, getPreset } from './presets'
import { playMidiWithSampler } from './sampleSampler'

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

export function midiToFrequency(midi) {
  const m = Number(midi)
  const safe = Number.isFinite(m) ? m : 69
  return 440 * Math.pow(2, (safe - 69) / 12)
}

async function playMidiSynth(midi, { durationMs = 200, type = 'triangle', gain = 0.2 } = {}) {
  const ctx = getAudioContext()
  if (!ctx) return

  await ensureRunning(ctx)

  const osc = ctx.createOscillator()
  const g = ctx.createGain()

  osc.type = type
  osc.frequency.value = midiToFrequency(midi)

  const now = ctx.currentTime
  const dur = Math.max(10, Number(durationMs) || 200) / 1000
  const peak = Math.max(0.0001, Number(gain) || 0.2)

  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(peak, now + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  osc.connect(g)
  g.connect(ctx.destination)

  osc.start(now)
  osc.stop(now + dur + 0.02)
}

export async function playMidi(
  midi,
  { durationMs = 200, type = 'triangle', gain = 0.2, instrumentType, presetId } = {},
) {
  const resolvedPresetId =
    presetId != null && String(presetId).trim()
      ? String(presetId).trim()
      : getDefaultPresetIdForInstrumentType(instrumentType)

  const preset = getPreset(resolvedPresetId)

  const transpose = Number(preset?.transposeSemitones)
  const safeTranspose = Number.isFinite(transpose) ? transpose : 0
  const m = Number(midi)
  const effectiveMidi = Number.isFinite(m) ? m + safeTranspose : midi

  if (preset?.type === 'sampler' && preset?.manifestUrl) {
    try {
      const ok = await playMidiWithSampler(preset.manifestUrl, effectiveMidi, { durationMs, gain })
      if (ok) return
      if (import.meta?.env?.DEV) {
        console.warn('[audio] Sampler nicht verwendet (ok=false), fallback auf Synth', {
          presetId: resolvedPresetId,
          instrumentType,
          manifestUrl: preset.manifestUrl,
          midi: effectiveMidi,
        })
      }
    } catch (err) {
      if (import.meta?.env?.DEV) {
        console.warn('[audio] Sampler fehlgeschlagen, fallback auf Synth', {
          presetId: resolvedPresetId,
          instrumentType,
          manifestUrl: preset.manifestUrl,
          midi: effectiveMidi,
          error: err,
        })
      }
    }
  }

  return playMidiSynth(effectiveMidi, { durationMs, type, gain })
}
