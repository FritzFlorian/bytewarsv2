/**
 * Suppression — sustained low pulse.
 * A pulsing drone that builds and lingers, ominous and authoritative.
 * Total duration: ~400ms.
 */
export function playSuppression(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Pulsed low-frequency drone
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(55, now)
  osc.frequency.setValueAtTime(50, now + 0.1)
  osc.frequency.setValueAtTime(55, now + 0.2)
  osc.frequency.setValueAtTime(50, now + 0.3)
  oscGain.gain.setValueAtTime(0.0, now)
  oscGain.gain.linearRampToValueAtTime(0.35, now + 0.05)
  oscGain.gain.setValueAtTime(0.35, now + 0.15)
  oscGain.gain.linearRampToValueAtTime(0.2, now + 0.25)
  oscGain.gain.setValueAtTime(0.3, now + 0.3)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.4)

  // High harmonic hiss on top for menace
  const bufSize = Math.ceil(ctx.sampleRate * 0.3)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const noiseFilter = ctx.createBiquadFilter()
  noiseFilter.type = 'bandpass'
  noiseFilter.frequency.value = 1200
  noiseFilter.Q.value = 2
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.0, now)
  noiseGain.gain.linearRampToValueAtTime(0.15, now + 0.05)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
  noise.connect(noiseFilter)
  noiseFilter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)
}
