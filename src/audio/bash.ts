/**
 * Bash — wooden thunk.
 * Short lowpassed noise "whack" plus a sine drop from 180 → 70 Hz,
 * deliberately chosen to sound WOODY (no high metallic ring, no
 * bright transient) — distinct from `clamp` (servo + clunk) and
 * `siege_cannon` (artillery boom).
 * Total duration: ~260ms.
 */
export function playBash(ctx: AudioContext): void {
  const now = ctx.currentTime
  const dur = 0.26

  // Whack — lowpassed short noise, the "impact" airborne layer.
  const bufSize = Math.ceil(ctx.sampleRate * 0.06)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buf
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(1400, now)
  lp.frequency.exponentialRampToValueAtTime(500, now + 0.06)
  const nGain = ctx.createGain()
  nGain.gain.setValueAtTime(0.55, now)
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  noise.connect(lp)
  lp.connect(nGain)
  nGain.connect(ctx.destination)
  noise.start(now)

  // Woody body — triangle falls fast, no ring tail.
  const body = ctx.createOscillator()
  const bodyGain = ctx.createGain()
  body.type = 'triangle'
  body.frequency.setValueAtTime(180, now)
  body.frequency.exponentialRampToValueAtTime(70, now + 0.12)
  bodyGain.gain.setValueAtTime(0.55, now)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + dur)
  body.connect(bodyGain)
  bodyGain.connect(ctx.destination)
  body.start(now)
  body.stop(now + dur)

  // Soft resonant wood-skin partial ~420 Hz, slightly out of tune with body.
  const res = ctx.createOscillator()
  const resGain = ctx.createGain()
  res.type = 'sine'
  res.frequency.setValueAtTime(420, now)
  res.frequency.exponentialRampToValueAtTime(330, now + dur)
  resGain.gain.setValueAtTime(0.2, now)
  resGain.gain.exponentialRampToValueAtTime(0.001, now + dur)
  res.connect(resGain)
  resGain.connect(ctx.destination)
  res.start(now)
  res.stop(now + dur)
}
