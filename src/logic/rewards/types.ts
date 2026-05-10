// Reward types for v0.7 M4 — module-drop + remove-module rework.
//
// A `Reward` is what gets *offered* to the player after a combat or elite node.
// A `RewardSelection` is what the player commits to when picking it — for kinds
// that need a target or further choices, the selection carries the player's pick.
//
// v0.7 changes vs v0.6:
//   - `rule_slot` removed — absorbed into passive module `logic_co_processor`.
//   - `module_drop` added — pre-rolled module; player picks a target unit.
//   - `remove_module` added — player picks unit + module to destroy.

import type { StarterPresetId } from '../../content/schema/starterPreset'
import type { SlotRef, UnitId } from '../state/types'

export type RewardKind = 'heal_one' | 'heal_all' | 'module_drop' | 'remove_module' | 'new_unit'

export type Reward =
  | { kind: 'heal_one' }
  | { kind: 'heal_all' }
  | { kind: 'module_drop'; moduleId: string }
  | { kind: 'remove_module' }
  | { kind: 'new_unit'; presetId: StarterPresetId }

/** Where the reward came from — affects offer weighting (Q-R6). */
export type RewardContext = 'combat' | 'elite'

export type RewardSelection =
  | { kind: 'heal_one'; targetUnitId: UnitId }
  | { kind: 'heal_all' }
  | { kind: 'module_drop'; targetUnitId: UnitId }
  | {
      kind: 'remove_module'
      targetUnitId: UnitId
      moduleIndex: number
      moduleType: 'active' | 'passive'
      moduleDefId: string
    }
  | { kind: 'new_unit'; newUnitId: UnitId; slot: SlotRef }
