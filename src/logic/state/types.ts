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
import type { AttackId } from '../../content/schema/attack'

export type UnitId = string

/** All chassis types. 'overseer' added in v0.4 as the boss chassis;
 *  'lawnbot', 'security_drone', 'swarmer', 'siege' added in v0.6. */
export type Chassis =
  | 'vacuum'
  | 'butler'
  | 'qa-rig'
  | 'overseer'
  | 'lawnbot'
  | 'security_drone'
  | 'swarmer'
  | 'siege'

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
  /**
   * Per-unit rule-slot count (T-6.12). Baseline 2, capped at 6 (Q-R4). Only
   * meaningful for owned (player) units — enemy fixtures may omit it. The
   * RunState's `ruleSlotsMap` is the runtime source of truth (so rule-slot
   * rewards can mutate it without rebuilding Unit objects); this field exists
   * so starter presets and reward-spawned units can seed that map.
   */
  ruleSlots?: number
}

/** All slots on the battlefield, keyed by a stable string `${side}-${row}-${column}`. */
export type SlotMap = Map<string, Unit>

export interface Battlefield {
  /** Live units, keyed by slotKey. Destroyed units are removed. */
  slots: SlotMap
  round: number
}

/** Cooldown counters: rounds remaining before each attack is available (0 = available). */
export type CooldownMap = Map<UnitId, Map<AttackId, number>>

export interface CombatState {
  battlefield: Battlefield
  seed: number
  finished: false | 'player' | 'enemy'
  /** Per-unit, per-attack cooldown counters. */
  cooldowns: CooldownMap
}

/** Convenience: produce the canonical slot-map key from a SlotRef. */
export function slotKey(ref: SlotRef): string {
  return `${ref.side}-${ref.row}-${ref.column}`
}
