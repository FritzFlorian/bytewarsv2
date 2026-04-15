/**
 * Mow — small 2-stroke engine run.
 * Sawtooth at ~120 Hz with random pitch jitter (engine imperfection)
 * and strong AM at ~22 Hz (firing cycles → putter-putter-putter).
 * A higher-octave harmonic adds the characteristic nasal rasp of a
 * garden tool. Intentionally goofy — this is a lawn bot.
 * Total duration: ~600ms.
 */
export function playMow(ctx: AudioContext): void {
  const now = ctx.currentTime
  const dur = 0.6

  // Main engine saw with stepped pitch jitter.
  const eng = ctx.createOscillator()
  eng.type = 'sawtooth'
  eng.frequency.setValueAtTime(118, now)
  for (let t = 0.03; t < dur; t += 0.03) {
    const jitter = 110 + Math.random() * 18
    eng.frequency.setValueAtTime(jitter, now + t)
  }

  // Nasal upper harmonic — thinner saw one octave up.
  const rasp = ctx.createOscillator()
  rasp.type = 'sawtooth'
  rasp.frequency.setValueAtTime(236, now)
  rasp.frequency.linearRampToValueAtTime(220, now + dur)
  const raspGain = ctx.createGain()
  raspGain.gain.setValueAtTime(0.08, now)

  // Main envelope.
  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0, now)
  env.gain.linearRampToValueAtTime(0.42, now + 0.08)
  env.gain.linearRampToValueAtTime(0.4, now + dur - 0.1)
  env.gain.exponentialRampToValueAtTime(0.001, now + dur)

  // AM at 22 Hz (firing cycles).
  const am = ctx.createOscillator()
  am.type = 'sine'
  am.frequency.setValueAtTime(22, now)
  const amDepth = ctx.createGain()
  amDepth.gain.value = 0.45
  const amBase = ctx.createGain()
  amBase.gain.value = 0.55
  am.connect(amDepth)
  amDepth.connect(amBase.gain)
  am.start(now)
  am.stop(now + dur)

  eng.connect(env)
  rasp.connect(raspGain)
  raspGain.connect(env)
  env.connect(amBase)
  amBase.connect(ctx.destination)
  eng.start(now)
  rasp.start(now)
  eng.stop(now + dur)
  rasp.stop(now + dur)
}
