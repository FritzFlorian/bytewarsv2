/**
 * Status applied stinger — synthesized via Web Audio API.
 *
 * Design: a brief two-tone shimmer. A short rising chirp followed by a
 * higher-octave bell ping. Communicates "something stuck" without overlapping
 * the meaty damage thud.
 *
 * Total duration: ~280ms.
 */
export function playStatusApplied(ctx: AudioContext): void {
  const now = ctx.currentTime

  // --- Rising chirp: triangle 440 → 880 Hz over 90 ms ---
  const chirp = ctx.createOscillator()
  chirp.type = 'triangle'
  chirp.frequency.setValueAtTime(440, now)
  chirp.frequency.exponentialRampToValueAtTime(880, now + 0.09)
  const chirpGain = ctx.createGain()
  chirpGain.gain.setValueAtTime(0.0001, now)
  chirpGain.gain.exponentialRampToValueAtTime(0.22, now + 0.01)
  chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
  chirp.connect(chirpGain)
  chirpGain.connect(ctx.destination)
  chirp.start(now)
  chirp.stop(now + 0.11)

  // --- Bell ping: sine 1320 Hz with quick decay ---
  const bell = ctx.createOscillator()
  bell.type = 'sine'
  bell.frequency.value = 1320
  const bellGain = ctx.createGain()
  bellGain.gain.setValueAtTime(0.0001, now + 0.08)
  bellGain.gain.exponentialRampToValueAtTime(0.18, now + 0.095)
  bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
  bell.connect(bellGain)
  bellGain.connect(ctx.destination)
  bell.start(now + 0.08)
  bell.stop(now + 0.3)
}
