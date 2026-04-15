/**
 * Pulse Shot — cartoon blaster pew.
 * Fast-falling square wave from 1800 → 220 Hz, ring-modulated against
 * a 60 Hz sine to inject sci-fi warble. Preceded by a brief charge
 * chirp. Cleanly pitched throughout — contrasts with `taser`'s
 * chaotic crackle and `siege_cannon`'s noisy boom.
 * Total duration: ~500ms.
 */
export function playPulseShot(ctx: AudioContext): void {
  const now = ctx.currentTime

  // Charge chirp — rising sine, 0–180ms.
  const charge = ctx.createOscillator()
  const chargeGain = ctx.createGain()
  charge.type = 'sine'
  charge.frequency.setValueAtTime(400, now)
  charge.frequency.exponentialRampToValueAtTime(1800, now + 0.18)
  chargeGain.gain.setValueAtTime(0.0, now)
  chargeGain.gain.linearRampToValueAtTime(0.25, now + 0.16)
  chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
  charge.connect(chargeGain)
  chargeGain.connect(ctx.destination)
  charge.start(now)
  charge.stop(now + 0.2)

  // Ring-modulated discharge — carrier × modulator via gain multiplication.
  // discharge 180–500ms.
  const discAt = now + 0.18
  const carrier = ctx.createOscillator()
  carrier.type = 'square'
  carrier.frequency.setValueAtTime(1800, discAt)
  carrier.frequency.exponentialRampToValueAtTime(220, discAt + 0.32)

  // Use a bipolar LFO driving a Gain.gain to approximate ring-mod AM.
  const ringOsc = ctx.createOscillator()
  ringOsc.type = 'sine'
  ringOsc.frequency.setValueAtTime(60, discAt)
  ringOsc.frequency.linearRampToValueAtTime(120, discAt + 0.32)
  const ringDepth = ctx.createGain()
  ringDepth.gain.value = 0.5
  ringOsc.connect(ringDepth)

  const modGain = ctx.createGain()
  modGain.gain.value = 0 // centered at 0 → true ring-mod around zero
  ringDepth.connect(modGain.gain)

  const env = ctx.createGain()
  env.gain.setValueAtTime(0.5, discAt)
  env.gain.exponentialRampToValueAtTime(0.001, discAt + 0.32)

  carrier.connect(modGain)
  modGain.connect(env)
  env.connect(ctx.destination)
  carrier.start(discAt)
  carrier.stop(discAt + 0.32)
  ringOsc.start(discAt)
  ringOsc.stop(discAt + 0.32)
}
