/**
 * Unit destroyed sound — synthesized via Web Audio API.
 *
 * Design: pure explosion — no impact transient, only the blast itself:
 *   1. Sub-bass boom — sine sweep (75 → 25 Hz) for the deep physical punch.
 *   2. Rumble body — low-pass filtered noise with a slow decay for the
 *      rolling aftermath.
 *
 * Total duration: ~1.2s.
 */
export function playDestroy(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Shared noise buffer (1.2s, used by rumble layer)
  const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.2), ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  // --- Layer 1: sub-bass boom — sine sweep for the physical punch ---
  const boom = ctx.createOscillator()
  const boomGain = ctx.createGain()
  boom.type = 'sine'
  boom.frequency.setValueAtTime(75, now)
  boom.frequency.exponentialRampToValueAtTime(25, now + 0.35)
  boomGain.gain.setValueAtTime(0.9, now)
  boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  boom.connect(boomGain)
  boomGain.connect(ctx.destination)
  boom.start(now)
  boom.stop(now + 0.35)

  // --- Layer 2: rumble — low-pass filtered noise, slow decay ---
  const rumble = ctx.createBufferSource()
  rumble.buffer = noiseBuffer

  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 400

  const rumbleGain = ctx.createGain()
  rumbleGain.gain.setValueAtTime(0.8, now)
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)

  rumble.connect(rumbleFilter)
  rumbleFilter.connect(rumbleGain)
  rumbleGain.connect(ctx.destination)
  rumble.start(now)
  rumble.stop(now + 1.2)
}
