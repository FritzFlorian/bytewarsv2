// CombatEvent discriminated union — v0.1 walking skeleton subset.
//
// Events NOT included yet (land in v0.2 with corresponding actions):
//   - unit_repaired  (needs repair action)
//   - status_applied (needs status system)
//   - unit_moved     (needs advance/retreat/swap actions)
//
// The union is intentionally kept open for extension: adding a new variant
// requires only appending to this type and handling it in the renderer.

import type { UnitId } from '../state/types'
import type { Action } from '../gambits/types'

export type CombatEvent =
  | { kind: 'round_started'; round: number }
  | { kind: 'turn_started'; unitId: UnitId }
  | { kind: 'rule_fired'; unitId: UnitId; ruleIndex: number }
  | { kind: 'action_used'; unitId: UnitId; action: Action; targets: UnitId[] }
  | { kind: 'damage_dealt'; sourceId: UnitId; targetId: UnitId; amount: number }
  | { kind: 'unit_destroyed'; unitId: UnitId }
  | { kind: 'turn_ended'; unitId: UnitId }
  | { kind: 'round_ended'; round: number }
  | { kind: 'combat_ended'; winner: 'player' | 'enemy' }
