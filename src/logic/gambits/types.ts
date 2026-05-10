// Gambit and action types for Bytewars v0.7.
//
// v0.7: Action kind is now a module ID string (not restricted to AttackId).
// This supports both attack and heal modules. The discriminated-union shape
// is intentionally stable — adding new module types requires no type changes.

export type TargetSelector = 'self' | 'nearest_enemy' | 'any_enemy' | 'any_ally' | 'weakest_ally'

export type Condition =
  | { kind: 'always' }
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }

/** Action references a module ID (string) or 'idle'. */
export type Action = { kind: string; target: TargetSelector } | { kind: 'idle' }

/** True when the action references a module (not idle). */
export function isAttackAction(action: Action): action is { kind: string; target: TargetSelector } {
  return action.kind !== 'idle'
}

export interface Rule {
  condition: Condition
  action: Action
}

/** Ordered top-to-bottom; first matching rule fires. */
export type GambitList = Rule[]
