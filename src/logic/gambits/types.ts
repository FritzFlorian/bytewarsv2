// Gambit and action types for Bytewars v0.1 walking skeleton.
//
// This is a deliberately small vocabulary subset. The full v1 vocabulary
// (target.distance, ally.count, status conditions, repair, advance, retreat, etc.)
// lands in v0.2. The discriminated-union *shape* is intentionally stable —
// adding new variants should not require changing existing ones.

export type TargetSelector = 'self' | 'nearest_enemy' | 'any_enemy'

export type Condition =
  | { kind: 'always' }
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }

export type Action =
  | { kind: 'attack'; target: TargetSelector }
  | { kind: 'idle' }

export interface Rule {
  condition: Condition
  action: Action
}

/** Ordered top-to-bottom; first matching rule fires. */
export type GambitList = Rule[]
