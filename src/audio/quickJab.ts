/**
 * Quick Jab — metallic tick via inharmonic partial cluster.
 * Three sine partials tuned to non-integer ratios (bell-like) decay
 * almost instantly, producing a bright "tink" reminiscent of a small
 * steel rod being struck. Very short, very bright — the spectral
 * signature (beating high partials) sets it apart from any noise-based
 * attack.
 * Total duration: ~160ms.
 */
export function playQuickJab(ctx: AudioContext): void {
  const now = ctx.currentTime
  const dur = 0.16

  // Inharmonic ratios chosen to beat rather than fuse into a pitch.
  const partials: Array<{ freq: number; gain: number }> = [
    { freq: 2350, gain: 0.32 },
    { freq: 3314, gain: 0.22 }, // × 1.41
    { freq: 5123, gain: 0.14 }, // × 2.18
  ]
  for (const p of partials) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(p.freq, now)
    g.gain.setValueAtTime(p.gain, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + dur)
  }
}
