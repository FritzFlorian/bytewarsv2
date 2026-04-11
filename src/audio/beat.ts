/**
 * Background combat beat — synthesized via Web Audio API.
 *
 * Design: a 4/4 loop at 118 BPM with a kick on beats 1 & 3, a snare on
 * beats 2 & 4, and a closed hi-hat on every eighth note. Industrial/electronic
 * feel to match the factory setting.
 *
 * Variation scheme (8-bar cycle):
 *   Bars 0–2  standard pattern
 *   Bar  3    fill — snare roll replaces beat 4 snare, leading into bar 4
 *   Bar  4    accent — bass synth stab on beat 1 marks the cycle midpoint
 *   Bars 5–6  standard pattern
 *   Bar  7    fill — snare roll + extra offbeat kick, leading back to bar 0
 *
 * Returns a stop function. Call it to halt the loop cleanly.
 */
export function startBeat(ctx: AudioContext): () => void {
  const bpm = 118
  const beat = 60 / bpm      // seconds per quarter note
  const eighth = beat / 2    // seconds per eighth note
  const sixteenth = beat / 4 // seconds per sixteenth note
  let stopped = false
  let nextTime = ctx.currentTime
  let barCount = 0

  // Pre-generate a shared noise buffer (reused for snare and hi-hat).
  const noiseBuffer = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * 0.08),
    ctx.sampleRate,
  )
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < noiseData.length; i++)
    noiseData[i] = Math.random() * 2 - 1

  function kick(t: number, vol = 0.7) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(90, t)
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.12)
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.18)
  }

  function snare(t: number, vol = 0.35) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 2200
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start(t)
    src.stop(t + 0.08)
  }

  function hihat(t: number, vol: number) {
    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 9000
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    src.start(t)
    src.stop(t + 0.04)
  }

  /** Four rapid snare hits (16th notes) starting at t — drum fill. */
  function snareRoll(t: number) {
    for (let i = 0; i < 4; i++)
      snare(t + i * sixteenth, 0.25 + i * 0.05)
  }

  /**
   * Bass synth stab — low sine pulse used to accent the midpoint of the cycle.
   * Gives an industrial "thump" without competing with the kick.
   */
  function bassStab(t: number) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(55, t)
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25)
    gain.gain.setValueAtTime(0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.25)
  }

  /** Schedule one full bar starting at t. */
  function scheduleBar(t: number) {
    const slot = barCount % 8

    // --- Kicks: always on beats 1 and 3 ---
    kick(t)
    kick(t + beat * 2)

    // --- Snare / fill ---
    snare(t + beat) // beat 2 always
    if (slot === 3 || slot === 7) {
      // Fill bar: replace beat 4 snare with a rapid roll into the next bar
      snareRoll(t + beat * 3)
    } else {
      snare(t + beat * 3)
    }

    // --- Extra offbeat kick on final fill bar for extra push ---
    if (slot === 7) {
      kick(t + beat * 3 + eighth, 0.4)
    }

    // --- Bass stab at the cycle midpoint (bar 4 of 8) ---
    if (slot === 4) {
      bassStab(t)
    }

    // --- Hi-hat: every eighth note, accented on quarter beats ---
    for (let e = 0; e < 8; e++) {
      const vol = e % 2 === 0 ? 0.12 : 0.07
      hihat(t + e * eighth, vol)
    }

    barCount++
  }

  function tick() {
    if (stopped) return
    while (nextTime < ctx.currentTime + 0.35) {
      scheduleBar(nextTime)
      nextTime += beat * 4
    }
    setTimeout(tick, 100)
  }

  tick()
  return () => { stopped = true }
}
