// Public API surface of the logic layer.
//
// UI and render layers must only import from here — never from internal paths
// like src/logic/combat/resolver.ts. This is the parallel-work seam: once
// T-1.5 is merged, Tracks A / B / C in M2 can proceed concurrently.

// --- Re-export all types ---

export type { UnitId, Side, Row, Column, SlotRef, Unit, SlotMap, Battlefield, CombatState } from './state/types'
export { slotKey } from './state/types'

export type { TargetSelector, Condition, Action, Rule, GambitList } from './gambits/types'

export type { CombatEvent } from './combat/events'

export type { Rng } from './rng'
export { createRng } from './rng'

// --- Public API functions (stubbed; replaced by T-2A.3) ---

import type { Unit, CombatState } from './state/types'
import type { CombatEvent } from './combat/events'

/**
 * Initialize a new combat from a set of player and enemy units.
 * @stub Implemented in T-2A.3
 */
export function createCombat(
  _seed: number,
  _playerUnits: Unit[],
  _enemyUnits: Unit[],
): CombatState {
  throw new Error('not implemented (T-2A.3)')
}

/**
 * Advance the combat by one round, returning the new state and the events that occurred.
 * @stub Implemented in T-2A.3
 */
export function resolveRound(
  _state: CombatState,
): { state: CombatState; events: CombatEvent[] } {
  throw new Error('not implemented (T-2A.3)')
}

/**
 * Check whether combat is over.
 * @stub Implemented in T-2A.3
 */
export function isCombatOver(_state: CombatState): false | 'player' | 'enemy' {
  throw new Error('not implemented (T-2A.3)')
}
