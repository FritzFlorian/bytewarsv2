/**
 * Bite — rising chitter "brrrrrip".
 * Rapid series of 10 short bandpassed clicks at rising pitch (380 Hz
 * → 1100 Hz), evoking insect mandibles grinding. The *series* is the
 * signature — every other attack is one or two events, this is a
 * dense roll.
 * Total duration: ~260ms.
 */
export function playBite(ctx: AudioContext): void {
  const now = ctx.currentTime
  const clicks = 10
  const span = 0.22

  for (let i = 0; i < clicks; i++) {
    const t = now + (i / (clicks - 1)) * span
    const progress = i / (clicks - 1)
    const pitch = 380 + progress * (1100 - 380)

    // Short noise burst shaped by a bandpass centered at the click's pitch.
    const bufSize = Math.ceil(ctx.sampleRate * 0.018)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(pitch, t)
    bp.Q.value = 6
    const g = ctx.createGain()
    // Rising dynamics — later clicks louder.
    g.gain.setValueAtTime(0.18 + progress * 0.28, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.018)
    noise.connect(bp)
    bp.connect(g)
    g.connect(ctx.destination)
    noise.start(t)
  }

  // Wet crunch tail after the last click.
  const tailAt = now + span + 0.005
  const tSize = Math.ceil(ctx.sampleRate * 0.03)
  const tBuf = ctx.createBuffer(1, tSize, ctx.sampleRate)
  const tData = tBuf.getChannelData(0)
  for (let i = 0; i < tSize; i++) tData[i] = Math.random() * 2 - 1
  const tail = ctx.createBufferSource()
  tail.buffer = tBuf
  const tLp = ctx.createBiquadFilter()
  tLp.type = 'lowpass'
  tLp.frequency.value = 900
  const tGain = ctx.createGain()
  tGain.gain.setValueAtTime(0.3, tailAt)
  tGain.gain.exponentialRampToValueAtTime(0.001, tailAt + 0.03)
  tail.connect(tLp)
  tLp.connect(tGain)
  tGain.connect(ctx.destination)
  tail.start(tailAt)
}
