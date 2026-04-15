/**
 * Dart — air swoosh into hollow tonk.
 * Two-phase: an airborne highpass-noise swoosh for the first 100 ms,
 * then a hollow pitched "tonk" (short bandpass noise + low-Q sine
 * resonance) as the dart lands. Clearly two events, distinct from the
 * single ping `quick_jab` uses.
 * Total duration: ~230ms.
 */
export function playDart(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Phase 1 — air swoosh, 0–110ms.
  const airSize = Math.ceil(ctx.sampleRate * 0.11)
  const airBuf = ctx.createBuffer(1, airSize, ctx.sampleRate)
  const airData = airBuf.getChannelData(0)
  for (let i = 0; i < airSize; i++) airData[i] = Math.random() * 2 - 1
  const air = ctx.createBufferSource()
  air.buffer = airBuf
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.setValueAtTime(800, now)
  hp.frequency.linearRampToValueAtTime(2800, now + 0.11)
  const airGain = ctx.createGain()
  airGain.gain.setValueAtTime(0.0, now)
  airGain.gain.linearRampToValueAtTime(0.4, now + 0.03)
  airGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11)
  air.connect(hp)
  hp.connect(airGain)
  airGain.connect(ctx.destination)
  air.start(now)

  // Phase 2 — hollow tonk, 110–230ms.
  const tonkAt = now + 0.11
  const tonkSize = Math.ceil(ctx.sampleRate * 0.04)
  const tonkBuf = ctx.createBuffer(1, tonkSize, ctx.sampleRate)
  const tonkData = tonkBuf.getChannelData(0)
  for (let i = 0; i < tonkSize; i++) tonkData[i] = Math.random() * 2 - 1
  const tonk = ctx.createBufferSource()
  tonk.buffer = tonkBuf
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 480
  bp.Q.value = 5
  const tonkGain = ctx.createGain()
  tonkGain.gain.setValueAtTime(0.6, tonkAt)
  tonkGain.gain.exponentialRampToValueAtTime(0.001, tonkAt + 0.04)
  tonk.connect(bp)
  bp.connect(tonkGain)
  tonkGain.connect(ctx.destination)
  tonk.start(tonkAt)

  // Body resonance — short pitched sine gives the "hollow" read.
  const body = ctx.createOscillator()
  const bodyGain = ctx.createGain()
  body.type = 'sine'
  body.frequency.setValueAtTime(440, tonkAt)
  body.frequency.exponentialRampToValueAtTime(260, tonkAt + 0.12)
  bodyGain.gain.setValueAtTime(0.32, tonkAt)
  bodyGain.gain.exponentialRampToValueAtTime(0.001, tonkAt + 0.12)
  body.connect(bodyGain)
  bodyGain.connect(ctx.destination)
  body.start(tonkAt)
  body.stop(tonkAt + 0.13)
}
