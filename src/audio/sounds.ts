/**
 * SoundId — all synthesized sounds used in Bytewars.
 *
 * `beat` is a looping background track managed via startMusic() in engine.ts.
 * All other IDs are one-shot sounds dispatched via playSound().
 */
export type SoundId = 'attack' | 'damage' | 'destroy' | 'beat' | 'win' | 'lose'
