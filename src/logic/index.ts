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

// --- Public API functions ---

export { createCombat, resolveRound, isCombatOver } from './combat/resolver'
