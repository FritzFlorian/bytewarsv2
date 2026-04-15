/**
 * Sweep — warm rotating floor-brush sweep.
 * Brown noise (softer, bassier than white) low-passed and amplitude-
 * modulated at ~8 Hz to evoke a rotating bristle brush. Filter opens
 * then closes across the stroke. Character: warm, organic, rhythmic —
 * intentionally not a pitched noise sweep.
 * Total duration: ~520ms.
 */
export function playSweep(ctx: AudioContext): void {
  const now = ctx.currentTime
  const dur = 0.52

  // Brown noise buffer (integrated white → -6 dB/oct spectrum).
  const bufSize = Math.ceil(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < bufSize; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.5
  }
  const src = ctx.createBufferSource()
  src.buffer = buf

  // Lowpass opens (stroke starts) and closes (stroke ends).
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(400, now)
  filter.frequency.linearRampToValueAtTime(1600, now + dur * 0.4)
  filter.frequency.linearRampToValueAtTime(300, now + dur)
  filter.Q.value = 0.6

  // Main envelope.
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0, now)
  env.gain.linearRampToValueAtTime(0.55, now + 0.05)
  env.gain.linearRampToValueAtTime(0.55, now + dur * 0.9)
  env.gain.exponentialRampToValueAtTime(0.001, now + dur)

  // Rotating-bristle AM at ~8 Hz — modulate env.gain via an LFO that
  // feeds a secondary Gain whose .gain is the AM target.
  const am = ctx.createOscillator()
  const amDepth = ctx.createGain()
  am.type = 'sine'
  am.frequency.setValueAtTime(8, now)
  amDepth.gain.setValueAtTime(0.35, now) // ±0.35 around env baseline
  am.connect(amDepth)
  const amGain = ctx.createGain()
  amGain.gain.setValueAtTime(0.7, now) // baseline (so AM swings 0.35–1.05)
  amDepth.connect(amGain.gain)
  am.start(now)
  am.stop(now + dur)

  src.connect(filter)
  filter.connect(env)
  env.connect(amGain)
  amGain.connect(ctx.destination)
  src.start(now)
}
