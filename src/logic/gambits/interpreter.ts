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
import { ROW_ORDER } from '../state/types'
import type { Rng } from '../rng'
import { isModuleAction, type Action, type Condition, type TargetSelector } from './types'

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
 * Return all living allies (same side), excluding the unit itself.
 */
function getAllies(unit: Unit, battlefield: Battlefield): Unit[] {
  return [...battlefield.slots.values()].filter(u => u.side === unit.side && u.id !== unit.id)
}

/**
 * Resolve a single-target selector to one unit, or `null` if none exists.
 * For AoE selectors, returns the first resolved target (or null). Use
 * `resolveTargets` when you need the full multi-target list.
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
  const targets = resolveTargets(selector, unit, battlefield, rng)
  return targets[0] ?? null
}

/**
 * Resolve a target selector to an ordered list of units.
 * - Single-target selectors return a 0- or 1-element array.
 * - AoE selectors return all matching units.
 */
export function resolveTargets(
  selector: TargetSelector,
  unit: Unit,
  battlefield: Battlefield,
  rng?: Rng,
): Unit[] {
  switch (selector) {
    case 'self':
      return [unit]
    case 'nearest_enemy': {
      const enemies = getEnemiesSorted(unit, battlefield)
      return enemies.length > 0 ? [enemies[0]] : []
    }
    case 'any_enemy': {
      const enemies = getEnemiesSorted(unit, battlefield)
      if (enemies.length === 0) return []
      const idx = rng ? rng.nextInt(enemies.length) : 0
      return [enemies[idx]]
    }
    case 'any_ally': {
      const allies = getAllies(unit, battlefield)
      if (allies.length === 0) return []
      const idx = rng ? rng.nextInt(allies.length) : 0
      return [allies[idx]]
    }
    case 'weakest_ally': {
      const allies = getAllies(unit, battlefield)
      if (allies.length === 0) return []
      return [allies.reduce((weakest, a) => (a.hp < weakest.hp ? a : weakest))]
    }
    case 'all_enemies':
      return getEnemiesSorted(unit, battlefield)
    case 'all_enemies_in_row': {
      // Choose the row containing the nearest enemy, then return all enemies in that row.
      const enemies = getEnemiesSorted(unit, battlefield)
      if (enemies.length === 0) return []
      const row = enemies[0].slot.row
      return enemies.filter(e => e.slot.row === row)
    }
    case 'all_allies': {
      // Include self for AoE buffs that should hit the caster too.
      return [unit, ...getAllies(unit, battlefield)]
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
      return unit.getHpPercentage() < condition.pct
    case 'target_exists':
      return resolveTargets(condition.target, unit, battlefield).length > 0
    case 'self_has_status':
      return unit.statusEffects.some(s => s.kind === condition.statusKind)
    case 'target_has_status': {
      const targets = resolveTargets(condition.target, unit, battlefield)
      return targets.some(t => t.statusEffects.some(s => s.kind === condition.statusKind))
    }
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
  // v0.8: disabled units skip their gambit walk entirely and idle.
  if (unit.isDisabled()) {
    return { ruleIndex: -1, action: { kind: 'idle' } }
  }
  for (let i = 0; i < unit.gambits.length; i++) {
    const rule = unit.gambits[i]
    if (!evaluateCondition(rule.condition, unit, battlefield)) continue

    // Non-idle actions reference a module by ID — check availability.
    if (isModuleAction(rule.action)) {
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
