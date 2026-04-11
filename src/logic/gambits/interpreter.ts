// Gambit interpreter for Bytewars v0.1.
//
// chooseAction walks a unit's gambit list top-to-bottom and returns the action
// from the first rule whose condition is satisfied. Falls through to `idle` if
// no rule matches.
//
// No RNG is needed for the v0.1 subset. `nearest_enemy` resolves deterministically:
// front row first, then middle, then back; ties broken by column (0 < 1 < 2).
// Tie-breaking randomisation is a v0.2 concern.

import type { Unit, Battlefield } from '../state/types'
import type { Action, Condition, TargetSelector } from './types'

/** Canonical row ordering — index 0 is closest to the opponent. */
const ROW_ORDER = ['front', 'middle', 'back'] as const

/**
 * Return all living units on the opposite side, sorted nearest-first
 * (front row → middle row → back row, ties by column ascending).
 */
function getEnemiesSorted(unit: Unit, battlefield: Battlefield): Unit[] {
  const enemySide = unit.side === 'player' ? 'enemy' : 'player'
  return [...battlefield.slots.values()]
    .filter(u => u.side === enemySide)
    .sort((a, b) => {
      const rowDiff = ROW_ORDER.indexOf(a.slot.row) - ROW_ORDER.indexOf(b.slot.row)
      if (rowDiff !== 0) return rowDiff
      return a.slot.column - b.slot.column
    })
}

/**
 * Resolve a TargetSelector to a concrete unit, or `null` if none exists.
 * Exported so the combat resolver can apply damage to the resolved target.
 */
export function resolveTarget(
  selector: TargetSelector,
  unit: Unit,
  battlefield: Battlefield,
): Unit | null {
  switch (selector) {
    case 'self':
      return unit
    case 'nearest_enemy': {
      const enemies = getEnemiesSorted(unit, battlefield)
      return enemies[0] ?? null
    }
    case 'any_enemy': {
      // In v0.1 any_enemy resolves the same way as nearest_enemy; the distinction
      // matters more when randomised selection is added in v0.2.
      const enemies = getEnemiesSorted(unit, battlefield)
      return enemies[0] ?? null
    }
  }
}

/** Evaluate a single condition for the given unit on the current battlefield. */
function evaluateCondition(
  condition: Condition,
  unit: Unit,
  battlefield: Battlefield,
): boolean {
  switch (condition.kind) {
    case 'always':
      return true
    case 'self_hp_below':
      return (unit.hp / unit.maxHp) * 100 < condition.pct
    case 'target_exists':
      return resolveTarget(condition.target, unit, battlefield) !== null
  }
}

export interface ChosenRule {
  /** Index of the rule that fired, or -1 if no rule matched (fallthrough to idle). */
  ruleIndex: number
  action: Action
}

/**
 * Walk the unit's gambit list top-to-bottom and return the matched rule index
 * and action. `ruleIndex` is -1 and action is `idle` when no rule matches.
 *
 * Pure function — no I/O, no globals, no side effects.
 */
export function chooseRule(unit: Unit, battlefield: Battlefield): ChosenRule {
  for (let i = 0; i < unit.gambits.length; i++) {
    if (evaluateCondition(unit.gambits[i].condition, unit, battlefield)) {
      return { ruleIndex: i, action: unit.gambits[i].action }
    }
  }
  return { ruleIndex: -1, action: { kind: 'idle' } }
}

/** Convenience wrapper — returns just the action. */
export function chooseAction(unit: Unit, battlefield: Battlefield): Action {
  return chooseRule(unit, battlefield).action
}
