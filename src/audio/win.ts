/**
 * Win stinger — synthesized via Web Audio API.
 *
 * Design: a short ascending major arpeggio (C4–E4–G4–C5) in a bright triangle
 * timbre, followed by a held chord. Feels earned without being bombastic.
 *
 * Total duration: ~1.8s.
 */
export function playWin(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Ascending arpeggio notes: C4, E4, G4, C5
  const arpFreqs = [261.63, 329.63, 392.0, 523.25]
  const arpGap = 0.18
  const arpDecay = 0.25

  arpFreqs.forEach((freq, i) => {
    const t = now + i * arpGap
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.25, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + arpDecay)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + arpDecay)
  })

  // Held major chord (C4 + G4) after the arpeggio finishes
  const chordStart = now + arpFreqs.length * arpGap + 0.05
  const chordFreqs = [261.63, 392.0, 523.25]
  chordFreqs.forEach(freq => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, chordStart)
    gain.gain.setValueAtTime(0, chordStart)
    gain.gain.linearRampToValueAtTime(0.12, chordStart + 0.02)
    gain.gain.setValueAtTime(0.12, chordStart + 0.6)
    gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.9)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(chordStart)
    osc.stop(chordStart + 0.9)
  })
}
