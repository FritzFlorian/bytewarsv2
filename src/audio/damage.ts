/**
 * Damage received sound — synthesized via Web Audio API.
 *
 * Design: wood hitting concrete — a short low-frequency impact with a brief
 * buzzy "tzz" transient at the point of contact.
 *   1. Click — near-instant broadband noise burst (the contact moment).
 *   2. Buzz — band-pass filtered noise (~350 Hz) for the woody "tzz" texture.
 *   3. Thud — low-pass filtered noise for the dull concrete-floor body.
 *
 * Total duration: ~120ms.
 */
export function playDamage(ctx: AudioContext): void {
  const now = ctx.currentTime

  const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.12), ctx.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

  // --- Click: bare noise burst, no filter, very short ---
  const click = ctx.createBufferSource()
  click.buffer = noiseBuffer
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0.8, now)
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008)
  click.connect(clickGain)
  clickGain.connect(ctx.destination)
  click.start(now)
  click.stop(now + 0.01)

  // --- Buzz: band-pass around 350 Hz for the woody "tzz" ---
  const buzz = ctx.createBufferSource()
  buzz.buffer = noiseBuffer
  const buzzFilter = ctx.createBiquadFilter()
  buzzFilter.type = 'bandpass'
  buzzFilter.frequency.value = 350
  buzzFilter.Q.value = 1.5
  const buzzGain = ctx.createGain()
  buzzGain.gain.setValueAtTime(0.6, now)
  buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06)
  buzz.connect(buzzFilter)
  buzzFilter.connect(buzzGain)
  buzzGain.connect(ctx.destination)
  buzz.start(now)
  buzz.stop(now + 0.07)

  // --- Thud: low-pass for the dull floor resonance ---
  const thud = ctx.createBufferSource()
  thud.buffer = noiseBuffer
  const thudFilter = ctx.createBiquadFilter()
  thudFilter.type = 'lowpass'
  thudFilter.frequency.value = 120
  const thudGain = ctx.createGain()
  thudGain.gain.setValueAtTime(0.7, now)
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
  thud.connect(thudFilter)
  thudFilter.connect(thudGain)
  thudGain.connect(ctx.destination)
  thud.start(now)
  thud.stop(now + 0.12)
}
