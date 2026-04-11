/**
 * SoundId — all synthesized sounds used in Bytewars.
 *
 * `beat` is a looping background track managed via startMusic() in engine.ts.
 * Attack sounds map 1:1 to AttackId values so CombatScreen can dispatch
 * `playSound(action.kind)` directly.
 */
export type SoundId =
  | 'quick_jab'
  | 'sweep'
  | 'taser'
  | 'overload'
  | 'clamp'
  | 'suppression'
  | 'damage'
  | 'destroy'
  | 'beat'
  | 'win'
  | 'lose'
