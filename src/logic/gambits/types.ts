// Gambit and action types for Bytewars v0.5.
//
// Actions now use named attack IDs instead of a generic 'attack' kind.
// The discriminated-union *shape* is intentionally stable — adding new
// attack IDs requires only extending AttackId in the content schema.

import type { AttackId } from '../../content/schema/attack'

export type TargetSelector = 'self' | 'nearest_enemy' | 'any_enemy'

export type Condition =
  | { kind: 'always' }
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }

export type Action = { kind: AttackId; target: TargetSelector } | { kind: 'idle' }

/** True when the action is a named attack (not idle). */
export function isAttackAction(
  action: Action,
): action is { kind: AttackId; target: TargetSelector } {
  return action.kind !== 'idle'
}

export interface Rule {
  condition: Condition
  action: Action
}

/** Ordered top-to-bottom; first matching rule fires. */
export type GambitList = Rule[]
