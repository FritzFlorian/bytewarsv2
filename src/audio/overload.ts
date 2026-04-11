/**
 * Overload — building surge then burst.
 * Rising oscillator swell that peaks and explodes into noise.
 * Total duration: ~500ms.
 */
export function playOverload(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Rising tone surge (0–300ms)
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(80, now)
  osc.frequency.exponentialRampToValueAtTime(600, now + 0.3)
  oscGain.gain.setValueAtTime(0.0, now)
  oscGain.gain.linearRampToValueAtTime(0.35, now + 0.28)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.32)

  // Burst: heavy noise explosion at peak (280–500ms)
  const bufSize = Math.ceil(ctx.sampleRate * 0.22)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.7, now + 0.28)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  noise.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now + 0.28)

  // Sub thud at burst point
  const sub = ctx.createOscillator()
  const subGain = ctx.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(120, now + 0.28)
  sub.frequency.exponentialRampToValueAtTime(30, now + 0.5)
  subGain.gain.setValueAtTime(0.4, now + 0.28)
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
  sub.connect(subGain)
  subGain.connect(ctx.destination)
  sub.start(now + 0.28)
  sub.stop(now + 0.5)
}
