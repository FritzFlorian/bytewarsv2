/**
 * Taser — chaotic electric crackle.
 * Short stuttering square-wave bursts at randomized high pitches,
 * interleaved with spikes of high-pass noise. The random timing and
 * pitch makes every play sound slightly different — clearly reads as
 * arcing electricity rather than a tuned "zap".
 * Total duration: ~260ms.
 */
export function playTaser(ctx: AudioContext): void {
  const now = ctx.currentTime
  const dur = 0.26
  const burstCount = 14

  for (let i = 0; i < burstCount; i++) {
    const t = now + Math.random() * (dur - 0.02)
    const len = 0.006 + Math.random() * 0.018

    // Random-pitch square blip — arc fragment
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'square'
    const f = 700 + Math.random() * 1800
    osc.frequency.setValueAtTime(f, t)
    osc.frequency.linearRampToValueAtTime(f * (0.4 + Math.random() * 0.6), t + len)
    g.gain.setValueAtTime(0.18 + Math.random() * 0.14, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + len)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + len)
  }

  // High-pass noise hiss on top — the air around the arc
  const bufSize = Math.ceil(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3500
  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.0, now)
  nGain.gain.linearRampToValueAtTime(0.18, now + 0.02)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + dur)
  noise.connect(hp)
  hp.connect(nGain)
  nGain.connect(ctx.destination)
  noise.start(now)
}
