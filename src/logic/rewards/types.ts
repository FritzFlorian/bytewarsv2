// Reward types for v0.6 (T-6.9).
//
// A `Reward` is what gets *offered* to the player after a combat or elite node.
// A `RewardSelection` is what the player commits to when picking it — for kinds
// that need a target (heal_one, rule_slot) or a placement (new_unit), the
// selection carries the player's choice.
//
// Discriminants on Reward and RewardSelection match 1:1 so applyReward() can
// pair them via a single switch on `reward.kind`.

import type { StarterPresetId } from '../../content/schema/starterPreset'
import type { SlotRef, UnitId } from '../state/types'

export type RewardKind = 'heal_one' | 'heal_all' | 'rule_slot' | 'new_unit'

export type Reward =
  | { kind: 'heal_one' }
  | { kind: 'heal_all' }
  | { kind: 'rule_slot' }
  | { kind: 'new_unit'; presetId: StarterPresetId }

/** Where the reward came from — affects offer weighting (Q-R6). */
export type RewardContext = 'combat' | 'elite'

export type RewardSelection =
  | { kind: 'heal_one'; targetUnitId: UnitId }
  | { kind: 'heal_all' }
  | { kind: 'rule_slot'; targetUnitId: UnitId }
  | { kind: 'new_unit'; newUnitId: UnitId; slot: SlotRef }
