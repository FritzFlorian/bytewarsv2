/**
 * Clamp — servo whirr locking shut.
 * Descending square-wave whirr (motor spinning down) followed by two
 * hard "clunk" hits a fraction of a second apart as the jaws latch.
 * Mechanical and pitched, clearly different from the pure noise-thud
 * it used to be.
 * Total duration: ~520ms.
 */
export function playClamp(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Servo whirr — descending pitched square (motor decelerating).
  const servo = ctx.createOscillator()
  const servoGain = ctx.createGain()
  servo.type = 'square'
  servo.frequency.setValueAtTime(620, now)
  servo.frequency.exponentialRampToValueAtTime(150, now + 0.32)
  servoGain.gain.setValueAtTime(0.0, now)
  servoGain.gain.linearRampToValueAtTime(0.2, now + 0.04)
  servoGain.gain.linearRampToValueAtTime(0.22, now + 0.3)
  servoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34)

  // Lowpass takes the edge off the square so it reads as a motor, not a buzz.
  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1400
  servo.connect(lp)
  lp.connect(servoGain)
  servoGain.connect(ctx.destination)
  servo.start(now)
  servo.stop(now + 0.36)

  // Two clunks — low sine blip + short noise burst, at 340ms and 460ms.
  function clunk(at: number): void {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, at)
    osc.frequency.exponentialRampToValueAtTime(55, at + 0.06)
    g.gain.setValueAtTime(0.6, at)
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.06)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.07)

    const bufSize = Math.ceil(ctx.sampleRate * 0.04)
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const nGain = ctx.createGain()
    nGain.gain.setValueAtTime(0.35, at)
    nGain.gain.exponentialRampToValueAtTime(0.001, at + 0.04)
    noise.connect(nGain)
    nGain.connect(ctx.destination)
    noise.start(at)
  }
  clunk(now + 0.34)
  clunk(now + 0.46)
}
