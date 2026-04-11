/**
 * Clamp — heavy mechanical thud.
 * Deep impact noise with a low resonant thump, like hydraulic jaws closing.
 * Total duration: ~250ms.
 */
export function playClamp(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Deep thud: low-frequency noise
  const bufSize = Math.ceil(ctx.sampleRate * 0.25)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  // Low-pass filter to give it a heavy, muffled character
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(300, now)
  filter.frequency.exponentialRampToValueAtTime(80, now + 0.25)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.6, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)

  // Resonant sub-bass punch
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(90, now)
  osc.frequency.exponentialRampToValueAtTime(25, now + 0.25)
  oscGain.gain.setValueAtTime(0.5, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.25)
}
