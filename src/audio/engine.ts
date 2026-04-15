/**
 * Audio engine — lazy AudioContext init and centralized sound dispatch.
 *
 * Rules:
 *   - initAudio() must be called from a browser user-gesture handler (click,
 *     keydown, etc.) before any sound can play. The AudioContext is created
 *     at that point and reused for the lifetime of the page.
 *   - Calling playSound() or startMusic() before initAudio() is safe — it is
 *     a no-op, not an error.
 *   - beat is managed via startMusic() / the returned stop function, not via
 *     playSound('beat') (which is a no-op by the registry entry in dispatch.ts).
 *
 * Dispatch is delegated to SOUND_DISPATCH (dispatch.ts). That registry is a
 * Record<SoundId, ...>, so adding a new SoundId without wiring a synthesis
 * function is a TypeScript error — no need for an exhaustive switch here.
 */

import type { SoundId } from './sounds'
import { SOUND_DISPATCH } from './dispatch'
import { startBeat } from './beat'

let ctx: AudioContext | null = null

/** Create the AudioContext. Must be called from a user-gesture handler. */
export function initAudio(): void {
  if (!ctx && typeof AudioContext !== 'undefined') ctx = new AudioContext()
}

/**
 * Dispatch a one-shot sound by ID.
 * Silently does nothing if initAudio() has not been called yet.
 * Passing 'beat' is a no-op — use startMusic() for the looping beat.
 */
export function playSound(id: SoundId): void {
  if (!ctx) return
  SOUND_DISPATCH[id].play(ctx)
}

/**
 * Start the looping background beat.
 * Returns a stop function — call it to halt the loop cleanly.
 * Safe to call before initAudio(); returns a no-op stop function in that case.
 */
export function startMusic(): () => void {
  if (!ctx) return () => {}
  return startBeat(ctx)
}
