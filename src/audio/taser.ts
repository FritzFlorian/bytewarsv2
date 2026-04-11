/**
 * Taser — electrical zap.
 * Rapid modulated oscillator burst with noise, electric character.
 * Total duration: ~120ms.
 */
export function playTaser(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Fast noise burst
  const bufSize = Math.ceil(ctx.sampleRate * 0.12)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.3, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  noise.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)

  // Rapidly modulated high-frequency tone
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(1800, now)
  osc.frequency.setValueAtTime(900, now + 0.02)
  osc.frequency.setValueAtTime(1800, now + 0.04)
  osc.frequency.setValueAtTime(900, now + 0.06)
  osc.frequency.setValueAtTime(1800, now + 0.08)
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.12)
  oscGain.gain.setValueAtTime(0.2, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.12)
}
