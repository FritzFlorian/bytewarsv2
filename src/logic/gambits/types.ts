// Gambit and action types for Bytewars v0.7.
//
// v0.7: Action kind is now a module ID string (not restricted to AttackId).
// This supports both attack and heal modules. The discriminated-union shape
// is intentionally stable — adding new module types requires no type changes.

export type TargetSelector =
  | 'self'
  | 'nearest_enemy'
  | 'any_enemy'
  | 'any_ally'
  | 'weakest_ally'
  | 'all_enemies'
  | 'all_enemies_in_row'
  | 'all_allies'

/** v0.8 — single-target selectors used for buff/debuff modules and conditions. */
export const SINGLE_TARGET_SELECTORS: readonly TargetSelector[] = [
  'self',
  'nearest_enemy',
  'any_enemy',
  'any_ally',
  'weakest_ally',
] as const

/** v0.8 — multi-target (AoE) selectors. */
export const AOE_TARGET_SELECTORS: readonly TargetSelector[] = [
  'all_enemies',
  'all_enemies_in_row',
  'all_allies',
] as const

export function isAoeSelector(t: TargetSelector): boolean {
  return AOE_TARGET_SELECTORS.includes(t)
}

import type { StatusKind } from '../../content/schema/status'

export type Condition =
  | { kind: 'always' }
  | { kind: 'self_hp_below'; pct: number }
  | { kind: 'target_exists'; target: TargetSelector }
  | { kind: 'self_has_status'; statusKind: StatusKind }
  | { kind: 'target_has_status'; target: TargetSelector; statusKind: StatusKind }

/** Action references a module ID (string) or 'idle'. */
export type Action = { kind: string; target: TargetSelector } | { kind: 'idle' }

/** True when the action references a module (not idle). Covers both attack and heal modules. */
export function isModuleAction(action: Action): action is { kind: string; target: TargetSelector } {
  return action.kind !== 'idle'
}

export interface Rule {
  condition: Condition
  action: Action
}

/** Ordered top-to-bottom; first matching rule fires. */
export type GambitList = Rule[]
