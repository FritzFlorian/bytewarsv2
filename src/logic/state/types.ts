// Core domain types for Bytewars v0.7.
//
// v0.7 changes:
//   - Unit is now a type alias for UnitInstance (class with installed modules)
//   - CooldownMap removed — cooldowns live on ActiveModuleInstance
//   - CombatState no longer carries a cooldowns field

import type { ChassisId } from '../../content/schema/chassis'
import { UnitInstance } from './UnitInstance'

export type { ActiveModuleInstance, PassiveModuleInstance } from './UnitInstance'
export { UnitInstance } from './UnitInstance'

export type UnitId = string

/** All chassis types. Canonical definition lives in ChassisIdSchema (chassis.ts). */
export type Chassis = ChassisId

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

/**
 * Unit is now a UnitInstance (v0.7). Carries installed modules, computed
 * stats, and cooldown state. See UnitInstance.ts for the class definition.
 */
export type Unit = UnitInstance

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
