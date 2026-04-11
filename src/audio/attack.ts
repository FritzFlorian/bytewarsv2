/**
 * Attack action sound — synthesized via Web Audio API, no asset files.
 *
 * Design: a short noise-burst impact followed by a descending square-wave
 * sweep. The noise gives the initial "hit" transient; the tone sweep gives
 * the electronic, robotic character.
 *
 * Total duration: ~180ms.
 */
export function playAttack(ctx: AudioContext): void {
  const now = ctx.currentTime

  // --- Impact: short white-noise burst (0–40ms) ---
  const bufferSize = Math.ceil(ctx.sampleRate * 0.04)
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = noiseBuffer

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.4, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

  noise.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)

  // --- Tone: descending square-wave sweep (0–180ms) ---
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()

  osc.type = 'square'
  osc.frequency.setValueAtTime(600, now)
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.18)

  oscGain.gain.setValueAtTime(0.25, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18)

  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.18)
}
