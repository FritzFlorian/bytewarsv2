/**
 * Overload — two-tone alarm siren + catastrophic pop.
 * Alternating siren tones at 520 Hz and 780 Hz build for ~600 ms
 * ("WEE-ooo-WEE-ooo"), climaxing in a short noise pop and sub-thud.
 * The siren pattern is the distinguishing feature — no other attack
 * uses alternating pitched tones.
 * Total duration: ~820ms.
 */
export function playOverload(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Siren — two oscillators crossfaded via stepped gains at 120 ms period.
  const low = ctx.createOscillator()
  const high = ctx.createOscillator()
  low.type = 'triangle'
  high.type = 'triangle'
  low.frequency.setValueAtTime(520, now)
  high.frequency.setValueAtTime(780, now)
  const lowGain = ctx.createGain()
  const highGain = ctx.createGain()

  const sirenEnd = 0.6
  const period = 0.12
  let t = 0
  let onHigh = false
  lowGain.gain.setValueAtTime(0, now)
  highGain.gain.setValueAtTime(0, now)
  while (t < sirenEnd) {
    // Quick crossfade between the two tones each half-period.
    lowGain.gain.linearRampToValueAtTime(onHigh ? 0.0 : 0.28, now + t + 0.02)
    highGain.gain.linearRampToValueAtTime(onHigh ? 0.28 : 0.0, now + t + 0.02)
    onHigh = !onHigh
    t += period / 2
  }
  // Ramp siren down just before the pop.
  lowGain.gain.linearRampToValueAtTime(0, now + sirenEnd + 0.04)
  highGain.gain.linearRampToValueAtTime(0, now + sirenEnd + 0.04)

  low.connect(lowGain)
  high.connect(highGain)
  lowGain.connect(ctx.destination)
  highGain.connect(ctx.destination)
  low.start(now)
  high.start(now)
  low.stop(now + sirenEnd + 0.08)
  high.stop(now + sirenEnd + 0.08)

  // Catastrophic pop at t = sirenEnd.
  const popAt = now + sirenEnd + 0.02
  const popSize = Math.ceil(ctx.sampleRate * 0.2)
  const popBuf = ctx.createBuffer(1, popSize, ctx.sampleRate)
  const popData = popBuf.getChannelData(0)
  for (let i = 0; i < popSize; i++) popData[i] = Math.random() * 2 - 1
  const pop = ctx.createBufferSource()
  pop.buffer = popBuf
  const popGain = ctx.createGain()
  popGain.gain.setValueAtTime(0.8, popAt)
  popGain.gain.exponentialRampToValueAtTime(0.001, popAt + 0.2)
  pop.connect(popGain)
  popGain.connect(ctx.destination)
  pop.start(popAt)

  // Sub thud under the pop.
  const sub = ctx.createOscillator()
  const subGain = ctx.createGain()
  sub.type = 'sine'
  sub.frequency.setValueAtTime(110, popAt)
  sub.frequency.exponentialRampToValueAtTime(28, popAt + 0.2)
  subGain.gain.setValueAtTime(0.6, popAt)
  subGain.gain.exponentialRampToValueAtTime(0.001, popAt + 0.2)
  sub.connect(subGain)
  subGain.connect(ctx.destination)
  sub.start(popAt)
  sub.stop(popAt + 0.22)
}
