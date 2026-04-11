/**
 * Quick Jab — short sharp click.
 * Fast transient noise burst with a brief high-pitched ping.
 * Total duration: ~80ms.
 */
export function playQuickJab(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Sharp click: very short noise burst (0–20ms)
  const bufSize = Math.ceil(ctx.sampleRate * 0.02)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.5, now)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02)
  noise.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(now)

  // Brief high ping (0–80ms)
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(2200, now)
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.08)
  oscGain.gain.setValueAtTime(0.18, now)
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08)
  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.08)
}
