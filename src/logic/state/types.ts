// Core domain types for Bytewars v0.1 walking skeleton.
//
// Intentionally minimal — the following are NOT present yet and land in v0.2:
//   - Module attachments on units
//   - Status effects
//   - Cooldown tracking
//   - Class info beyond what's needed for the fixture
//   - Anything beyond the 3×3 slot grid combat layout
//
// Extend by adding fields here and updating the consumers; the discriminated-
// union shapes in gambits/types.ts and combat/events.ts should not need to change.

import type { GambitList } from '../gambits/types'

export type UnitId = string

/** All chassis types. 'overseer' added in v0.4 as the boss chassis. */
export type Chassis = 'vacuum' | 'butler' | 'qa-rig' | 'overseer'

export type Side = 'player' | 'enemy'

/** Front row is closest to the opponent; back row is furthest. */
export type Row = 'front' | 'middle' | 'back'

/** 0 = left, 1 = centre, 2 = right (from the perspective of the owning side). */
export type Column = 0 | 1 | 2

export interface SlotRef {
  side: Side
  row: Row
  column: Column
}

export interface Unit {
  id: UnitId
  side: Side
  slot: SlotRef
  chassis: Chassis
  hp: number
  maxHp: number
  gambits: GambitList
}

/** All slots on the battlefield, keyed by a stable string `${side}-${row}-${column}`. */
export type SlotMap = Map<string, Unit>

export interface Battlefield {
  /** Live units, keyed by slotKey. Destroyed units are removed. */
  slots: SlotMap
  round: number
}

export interface CombatState {
  battlefield: Battlefield
  seed: number
  finished: false | 'player' | 'enemy'
}

/** Convenience: produce the canonical slot-map key from a SlotRef. */
export function slotKey(ref: SlotRef): string {
  return `${ref.side}-${ref.row}-${ref.column}`
}
