// CombatEvent discriminated union — v0.7.
//
// v0.7: added `unit_healed` for heal module actions.
// Remaining planned events (not yet implemented):
//   - status_applied (needs status system)
//   - unit_moved     (needs advance/retreat/swap actions)
//
// The union is intentionally kept open for extension: adding a new variant
// requires only appending to this type and handling it in the renderer.

import type { UnitId } from '../state/types'
import type { Action } from '../gambits/types'
import type { StatusKind } from '../../content/schema/status'

export type CombatEvent =
  | { kind: 'round_started'; round: number }
  | { kind: 'turn_started'; unitId: UnitId }
  | { kind: 'rule_fired'; unitId: UnitId; ruleIndex: number }
  | { kind: 'action_used'; unitId: UnitId; action: Action; targets: UnitId[] }
  | { kind: 'damage_dealt'; sourceId: UnitId; targetId: UnitId; amount: number }
  | { kind: 'unit_healed'; sourceId: UnitId; targetId: UnitId; amount: number }
  | { kind: 'unit_destroyed'; unitId: UnitId }
  | {
      kind: 'status_applied'
      sourceId: UnitId
      targetId: UnitId
      statusKind: StatusKind
      magnitude: number
      duration: number
    }
  | { kind: 'status_expired'; unitId: UnitId; statusKind: StatusKind }
  | { kind: 'status_tick_damage'; unitId: UnitId; statusKind: StatusKind; amount: number }
  | { kind: 'turn_ended'; unitId: UnitId }
  | { kind: 'round_ended'; round: number }
  | { kind: 'combat_ended'; winner: 'player' | 'enemy' }
