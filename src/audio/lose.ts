/**
 * Lose stinger — synthesized via Web Audio API.
 *
 * Design: a descending minor phrase (A4–F4–D4–A3) in a sawtooth timbre,
 * followed by a final low drone that fades to silence. Should feel like a
 * system shutting down — somber, not melodramatic.
 *
 * Total duration: ~2.2s.
 */
export function playLose(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Descending minor arpeggio: A4, F4, D4, A3
  const arpFreqs = [440, 349.23, 293.66, 220]
  const arpGap = 0.22
  const arpDecay = 0.35

  arpFreqs.forEach((freq, i) => {
    const t = now + i * arpGap
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + arpDecay)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + arpDecay)
  })

  // Final low drone — power-off feel
  const droneStart = now + arpFreqs.length * arpGap + 0.05
  const drone = ctx.createOscillator()
  const droneGain = ctx.createGain()
  drone.type = 'sawtooth'
  drone.frequency.setValueAtTime(110, droneStart)
  drone.frequency.exponentialRampToValueAtTime(55, droneStart + 0.8)
  droneGain.gain.setValueAtTime(0, droneStart)
  droneGain.gain.linearRampToValueAtTime(0.2, droneStart + 0.05)
  droneGain.gain.setValueAtTime(0.2, droneStart + 0.3)
  droneGain.gain.exponentialRampToValueAtTime(0.001, droneStart + 0.8)
  drone.connect(droneGain)
  droneGain.connect(ctx.destination)
  drone.start(droneStart)
  drone.stop(droneStart + 0.8)
}
