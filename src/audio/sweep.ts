/**
 * Sweep — whooshing glide.
 * Filtered noise that sweeps from high to low frequency, like a spinning blade.
 * Total duration: ~350ms.
 */
export function playSweep(ctx: AudioContext): void {
  const now = ctx.currentTime

  // White noise source
  const bufSize = Math.ceil(ctx.sampleRate * 0.35)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf

  // Bandpass filter — sweeps centre frequency downward
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(3000, now)
  filter.frequency.exponentialRampToValueAtTime(200, now + 0.35)
  filter.Q.value = 4

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0, now)
  gain.gain.linearRampToValueAtTime(0.6, now + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  noise.start(now)

  // Underlying tone glide adds body
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(400, now)
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.35)
  oscGain.gain.setValueAtTime(0.12, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.35)
}
