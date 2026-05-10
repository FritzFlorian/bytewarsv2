// Gambit interpreter for Bytewars v0.7.
//
// chooseAction walks a unit's gambit list top-to-bottom and returns the action
// from the first rule whose condition is satisfied AND whose action can be
// performed (module installed and off cooldown). Falls through to `idle` if
// no rule matches.
//
// v0.7: the interpreter checks installed modules and cooldowns on the unit's
// ActiveModuleInstance array. A rule is skipped silently if its action
// references a module that is not installed or is on cooldown.
//
// `nearest_enemy` resolves deterministically: front row first, then middle,
// then back; ties broken by column (0 < 1 < 2).
// `any_enemy` picks a random living enemy using the seeded RNG (pass via rng param).

import type { Unit, Battlefield } from '../state/types'
import type { Rng } from '../rng'
import { isAttackAction, type Action, type Condition, type TargetSelector } from './types'

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
 *
 * Pass `rng` for `any_enemy` random selection. Without it, `any_enemy` falls
 * back to index 0 (deterministic — suitable for existence checks only).
 */
export function resolveTarget(
  selector: TargetSelector,
  unit: Unit,
  battlefield: Battlefield,
  rng?: Rng,
): Unit | null {
  switch (selector) {
    case 'self':
      return unit
    case 'nearest_enemy': {
      const enemies = getEnemiesSorted(unit, battlefield)
      return enemies[0] ?? null
    }
    case 'any_enemy': {
      const enemies = getEnemiesSorted(unit, battlefield)
      if (enemies.length === 0) return null
      const idx = rng ? rng.nextInt(enemies.length) : 0
      return enemies[idx]
    }
  }
}

/** Evaluate a single condition for the given unit on the current battlefield. */
export function evaluateCondition(
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
 * v0.7: module-aware — skips rules whose action references a module that is
 * not installed on the unit or is on cooldown (cooldownRemaining > 0).
 */
export function chooseRule(unit: Unit, battlefield: Battlefield): ChosenRule {
  for (let i = 0; i < unit.gambits.length; i++) {
    const rule = unit.gambits[i]
    if (!evaluateCondition(rule.condition, unit, battlefield)) continue

    // Non-idle actions reference a module by ID — check availability.
    if (isAttackAction(rule.action)) {
      const mod = unit.activeModules.find(m => m.defId === rule.action.kind)
      if (!mod || mod.cooldownRemaining > 0) {
        continue // module not installed or on cooldown — fall through
      }
    }

    return { ruleIndex: i, action: rule.action }
  }
  return { ruleIndex: -1, action: { kind: 'idle' } }
}

/** Convenience wrapper — returns just the action. */
export function chooseAction(unit: Unit, battlefield: Battlefield): Action {
  return chooseRule(unit, battlefield).action
}
