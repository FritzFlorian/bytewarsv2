/**
 * Suppression — loudhailer field hum.
 * Sawtooth carrier shaped through two parallel bandpass filters tuned
 * to vowel-like formants (700 Hz, 1200 Hz), with a slow formant drift
 * making the tone "speak". Sub drone underneath. Character: cold,
 * broadcast, authoritative — the Overseer *telling* you to stop.
 * Total duration: ~720ms.
 */
export function playSuppression(ctx: AudioContext): void {
  const now = ctx.currentTime
  const dur = 0.72

  // Sawtooth carrier — the rich source the formants shape.
  const carrier = ctx.createOscillator()
  carrier.type = 'sawtooth'
  carrier.frequency.setValueAtTime(120, now)
  carrier.frequency.linearRampToValueAtTime(95, now + dur)

  // Two parallel bandpasses → formant pair.
  const f1 = ctx.createBiquadFilter()
  f1.type = 'bandpass'
  f1.Q.value = 9
  f1.frequency.setValueAtTime(700, now)
  f1.frequency.linearRampToValueAtTime(500, now + dur * 0.6)
  f1.frequency.linearRampToValueAtTime(620, now + dur)

  const f2 = ctx.createBiquadFilter()
  f2.type = 'bandpass'
  f2.Q.value = 11
  f2.frequency.setValueAtTime(1200, now)
  f2.frequency.linearRampToValueAtTime(1500, now + dur * 0.6)
  f2.frequency.linearRampToValueAtTime(1050, now + dur)

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.0, now)
  env.gain.linearRampToValueAtTime(0.35, now + 0.08)
  env.gain.linearRampToValueAtTime(0.35, now + dur - 0.12)
  env.gain.exponentialRampToValueAtTime(0.001, now + dur)

  // Mix formants to one summing node (two parallel paths into env).
  carrier.connect(f1)
  carrier.connect(f2)
  const formantMix = ctx.createGain()
  formantMix.gain.value = 0.55
  f1.connect(formantMix)
  f2.connect(formantMix)
  formantMix.connect(env)
  env.connect(ctx.destination)
  carrier.start(now)
  carrier.stop(now + dur)

  // Sub drone — sells the "field" weight.
  const sub = ctx.createOscillator()
  const subGain = ctx.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(55, now)
  subGain.gain.setValueAtTime(0.0, now)
  subGain.gain.linearRampToValueAtTime(0.3, now + 0.1)
  subGain.gain.linearRampToValueAtTime(0.3, now + dur - 0.1)
  subGain.gain.exponentialRampToValueAtTime(0.001, now + dur)
  sub.connect(subGain)
  subGain.connect(ctx.destination)
  sub.start(now)
  sub.stop(now + dur)
}
