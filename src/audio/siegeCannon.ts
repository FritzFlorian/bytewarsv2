/**
 * Siege Cannon — mortar ka-chunk, fire, echo.
 * Three-phase:
 *   0–120ms  — mechanical lock-and-load "ka-chunk" (two short bandpassed
 *              noise hits) — a pre-fire tell no other attack has.
 *   140–490ms — main blast: broadband noise + very deep sub decay.
 *   490–1500ms — slap-back echo tail: DelayNode + feedback loop lowpassed
 *              so each repeat is muffled, giving an open-field echo.
 * Distinctive because it has a clear *before*, *impact*, and *after*,
 * where every other attack is a single gesture.
 * Total duration: ~1500ms.
 */
export function playSiegeCannon(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Phase 1 — ka-chunk (two short bandpassed noise hits at different pitches).
  function chunk(at: number, pitch: number): void {
    const bufSize = Math.ceil(ctx.sampleRate * 0.04)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = pitch
    bp.Q.value = 4
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.35, at)
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.04)
    src.connect(bp)
    bp.connect(g)
    g.connect(ctx.destination)
    src.start(at)
  }
  chunk(now, 900)
  chunk(now + 0.06, 560)

  // Phase 2 — main blast at 140 ms, fed into a feedback delay for the tail.
  const blastAt = now + 0.14
  const blastSize = Math.ceil(ctx.sampleRate * 0.35)
  const blastBuf = ctx.createBuffer(1, blastSize, ctx.sampleRate)
  const blastData = blastBuf.getChannelData(0)
  for (let i = 0; i < blastSize; i++) blastData[i] = Math.random() * 2 - 1
  const blast = ctx.createBufferSource()
  blast.buffer = blastBuf
  const blastGain = ctx.createGain()
  blastGain.gain.setValueAtTime(0.9, blastAt)
  blastGain.gain.exponentialRampToValueAtTime(0.001, blastAt + 0.35)

  // Phase 3 — DelayNode + feedback + lowpass = muffled slap-back tail.
  const delay = ctx.createDelay(0.6)
  delay.delayTime.value = 0.22
  const feedback = ctx.createGain()
  feedback.gain.value = 0.45
  const echoFilter = ctx.createBiquadFilter()
  echoFilter.type = 'lowpass'
  echoFilter.frequency.value = 500
  // blast → blastGain → (direct to out) AND (→ delay → echoFilter → feedback → delay)
  blast.connect(blastGain)
  blastGain.connect(ctx.destination)
  blastGain.connect(delay)
  delay.connect(echoFilter)
  echoFilter.connect(feedback)
  feedback.connect(delay)
  echoFilter.connect(ctx.destination)
  blast.start(blastAt)

  // Deep sub punch under the blast.
  const sub = ctx.createOscillator()
  const subGain = ctx.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(65, blastAt)
  sub.frequency.exponentialRampToValueAtTime(20, blastAt + 0.5)
  subGain.gain.setValueAtTime(0.75, blastAt)
  subGain.gain.exponentialRampToValueAtTime(0.001, blastAt + 0.5)
  sub.connect(subGain)
  subGain.connect(ctx.destination)
  sub.start(blastAt)
  sub.stop(blastAt + 0.55)

  // Bleed the feedback to 0 around 1.3 s so the tail doesn't ring forever.
  feedback.gain.setValueAtTime(0.45, blastAt + 0.8)
  feedback.gain.linearRampToValueAtTime(0, blastAt + 1.3)
}
