// Combat resolver for Bytewars v0.1.
//
// Simplifications that are in place for the walking skeleton only:
//   - Damage is fixed at 10 per attack (no variance, no crit, no modules).
//   - Row/column reach rules are NOT enforced — any unit can attack any other
//     unit regardless of row. Reach rules land in v0.2 with content data.
//   - Turn order is interleaved: player units and enemy units sorted by
//     front→middle→back row, then column 0→2. If one side has more units they
//     act consecutively at the end. No player-configurable ordering yet.

import type { Unit, Battlefield, CombatState, SlotMap, Side } from '../state/types'
import { slotKey } from '../state/types'
import type { CombatEvent } from './events'
import { chooseRule, resolveTarget } from '../gambits/interpreter'
import { createRng } from '../rng'

/** Fixed damage per attack in v0.1. Revisit once modules exist in v0.2. */
const ATTACK_DAMAGE = 10

const ROW_ORDER = ['front', 'middle', 'back'] as const

function unitSortKey(u: Unit): number {
  return ROW_ORDER.indexOf(u.slot.row) * 3 + u.slot.column
}

function getUnitsBySide(slots: SlotMap, side: Side): Unit[] {
  return [...slots.values()]
    .filter(u => u.side === side)
    .sort((a, b) => unitSortKey(a) - unitSortKey(b))
}

/**
 * Build the interleaved turn order for the round.
 * player[0], enemy[0], player[1], enemy[1], …
 * Extra units from the longer side are appended at the end.
 */
function buildTurnOrder(slots: SlotMap): Unit[] {
  const players = getUnitsBySide(slots, 'player')
  const enemies = getUnitsBySide(slots, 'enemy')
  const order: Unit[] = []
  const len = Math.max(players.length, enemies.length)
  for (let i = 0; i < len; i++) {
    if (i < players.length) order.push(players[i])
    if (i < enemies.length) order.push(enemies[i])
  }
  return order
}

function checkWinner(slots: SlotMap): 'player' | 'enemy' | null {
  const hasPlayer = [...slots.values()].some(u => u.side === 'player')
  const hasEnemy  = [...slots.values()].some(u => u.side === 'enemy')
  if (!hasEnemy)  return 'player'
  if (!hasPlayer) return 'enemy'
  return null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createCombat(
  seed: number,
  playerUnits: Unit[],
  enemyUnits: Unit[],
): CombatState {
  const slots: SlotMap = new Map()
  for (const unit of [...playerUnits, ...enemyUnits]) {
    slots.set(slotKey(unit.slot), unit)
  }
  return { battlefield: { slots, round: 1 }, seed, finished: false }
}

export function isCombatOver(state: CombatState): false | 'player' | 'enemy' {
  return checkWinner(state.battlefield.slots) ?? false
}

export function resolveRound(
  state: CombatState,
): { state: CombatState; events: CombatEvent[] } {
  const events: CombatEvent[] = []

  // Create a seeded RNG for this round. All randomness (e.g. any_enemy target
  // selection) flows through this instance so replays are deterministic.
  const rng = createRng(state.seed)

  // Work on a mutable snapshot of the slot map so destroyed units are removed
  // immediately and subsequent turns see the updated battlefield.
  const slots: SlotMap = new Map(state.battlefield.slots)
  const round = state.battlefield.round

  events.push({ kind: 'round_started', round })

  // Turn order is captured once at the start of the round (by slot key).
  // We check whether each unit is still alive before giving it a turn.
  const turnOrder = buildTurnOrder(slots)

  for (const unitSnapshot of turnOrder) {
    const unit = slots.get(slotKey(unitSnapshot.slot))
    if (!unit) continue   // destroyed earlier this round

    const bf: Battlefield = { slots, round }

    events.push({ kind: 'turn_started', unitId: unit.id })

    const { ruleIndex, action } = chooseRule(unit, bf)
    events.push({ kind: 'rule_fired', unitId: unit.id, ruleIndex })

    if (action.kind === 'attack') {
      const target = resolveTarget(action.target, unit, bf, rng)
      const targetIds = target ? [target.id] : []
      events.push({ kind: 'action_used', unitId: unit.id, action, targets: targetIds })

      if (target) {
        events.push({ kind: 'damage_dealt', sourceId: unit.id, targetId: target.id, amount: ATTACK_DAMAGE })
        const newHp = target.hp - ATTACK_DAMAGE
        if (newHp <= 0) {
          slots.delete(slotKey(target.slot))
          events.push({ kind: 'unit_destroyed', unitId: target.id })
        } else {
          slots.set(slotKey(target.slot), { ...target, hp: newHp })
        }
      }
    } else {
      // idle (or future non-attack actions)
      events.push({ kind: 'action_used', unitId: unit.id, action, targets: [] })
    }

    events.push({ kind: 'turn_ended', unitId: unit.id })
  }

  events.push({ kind: 'round_ended', round })

  const winner = checkWinner(slots)
  if (winner) {
    events.push({ kind: 'combat_ended', winner })
  }

  const newState: CombatState = {
    battlefield: { slots, round: round + 1 },
    // Advance the seed so each round draws a different RNG sequence.
    seed: rng.nextInt(0x100000000) + 1,
    finished: winner ?? false,
  }

  return { state: newState, events }
}
