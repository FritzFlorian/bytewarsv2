// Combat resolver for Bytewars v0.5.
//
// v0.5 changes:
//   - Damage is per-attack (from attackDef.damage); ATTACK_DAMAGE constant removed.
//   - Cooldowns tracked in CombatState.cooldowns; initialCooldown applied at combat start.
//   - Gambit interpreter: if the chosen attack is on cooldown, fall through to next rule.
//   - Row/column reach rules are still NOT enforced (deferred to v0.6+).

import type { Unit, Battlefield, CombatState, SlotMap, Side, CooldownMap } from '../state/types'
import { slotKey } from '../state/types'
import type { CombatEvent } from './events'
import { evaluateCondition, resolveTarget } from '../gambits/interpreter'
import { isAttackAction, type Action } from '../gambits/types'
import { createRng } from '../rng'
import { getAttackDef, getAttacksForChassis } from '../content/attackLoader'
import type { AttackId } from '../../content/schema/attack'

const ROW_ORDER = ['front', 'middle', 'back'] as const

function unitSortKey(u: Unit): number {
  return ROW_ORDER.indexOf(u.slot.row) * 3 + u.slot.column
}

function getUnitsBySide(slots: SlotMap, side: Side): Unit[] {
  return [...slots.values()]
    .filter(u => u.side === side)
    .sort((a, b) => unitSortKey(a) - unitSortKey(b))
}

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
  const hasEnemy = [...slots.values()].some(u => u.side === 'enemy')
  if (!hasEnemy) return 'player'
  if (!hasPlayer) return 'enemy'
  return null
}

/**
 * Build initial cooldown map.
 *
 * Stored value semantics: the counter is decremented at the start of each
 * round; an attack is blocked when cd > 0 AFTER decrementing.
 *
 * To make "initialCooldown=N" mean "unavailable for N rounds at battle start"
 * we store N+1 so that the round-1 decrement leaves the counter at N (still > 0).
 * After N more decrements (N rounds) the counter reaches 0 and the attack is
 * available. The same logic applies to cooldown after use: we store cooldown+1.
 */
function buildInitialCooldowns(units: Unit[]): CooldownMap {
  const map: CooldownMap = new Map()
  for (const unit of units) {
    const unitMap = new Map<AttackId, number>()
    for (const atk of getAttacksForChassis(unit.chassis)) {
      if (atk.initialCooldown > 0) {
        unitMap.set(atk.id, atk.initialCooldown + 1)
      }
    }
    map.set(unit.id, unitMap)
  }
  return map
}

function getCooldown(cooldowns: CooldownMap, unitId: string, attackId: AttackId): number {
  return cooldowns.get(unitId)?.get(attackId) ?? 0
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createCombat(seed: number, playerUnits: Unit[], enemyUnits: Unit[]): CombatState {
  const allUnits = [...playerUnits, ...enemyUnits]
  const slots: SlotMap = new Map()
  for (const unit of allUnits) {
    slots.set(slotKey(unit.slot), unit)
  }
  const cooldowns = buildInitialCooldowns(allUnits)
  return { battlefield: { slots, round: 1 }, seed, finished: false, cooldowns }
}

export function isCombatOver(state: CombatState): false | 'player' | 'enemy' {
  return checkWinner(state.battlefield.slots) ?? false
}

export function resolveRound(state: CombatState): { state: CombatState; events: CombatEvent[] } {
  const events: CombatEvent[] = []
  const rng = createRng(state.seed)

  const slots: SlotMap = new Map(state.battlefield.slots)
  const round = state.battlefield.round

  // Deep-copy cooldowns so mutations this round don't affect the original state.
  const cooldowns: CooldownMap = new Map()
  for (const [uid, atkMap] of state.cooldowns) {
    cooldowns.set(uid, new Map(atkMap))
  }

  events.push({ kind: 'round_started', round })

  // Decrement all non-zero cooldowns at the start of each round.
  for (const atkMap of cooldowns.values()) {
    for (const [atkId, cd] of atkMap) {
      if (cd > 0) atkMap.set(atkId, cd - 1)
    }
  }

  const turnOrder = buildTurnOrder(slots)

  for (const unitSnapshot of turnOrder) {
    const unit = slots.get(slotKey(unitSnapshot.slot))
    if (!unit) continue

    const bf: Battlefield = { slots, round }

    events.push({ kind: 'turn_started', unitId: unit.id })

    // Walk gambit list; skip attack rules whose attack is on cooldown.
    let chosenRuleIndex = -1
    let chosenAction: Action = { kind: 'idle' }

    for (let i = 0; i < unit.gambits.length; i++) {
      const rule = unit.gambits[i]
      if (!evaluateCondition(rule.condition, unit, bf)) continue
      if (isAttackAction(rule.action) && getCooldown(cooldowns, unit.id, rule.action.kind) > 0) {
        continue // on cooldown — fall through to next rule
      }
      chosenRuleIndex = i
      chosenAction = rule.action
      break
    }

    events.push({ kind: 'rule_fired', unitId: unit.id, ruleIndex: chosenRuleIndex })

    if (isAttackAction(chosenAction)) {
      const target = resolveTarget(chosenAction.target, unit, bf, rng)
      const targetIds = target ? [target.id] : []
      events.push({
        kind: 'action_used',
        unitId: unit.id,
        action: chosenAction,
        targets: targetIds,
      })

      if (target) {
        const atkDef = getAttackDef(chosenAction.kind)
        events.push({
          kind: 'damage_dealt',
          sourceId: unit.id,
          targetId: target.id,
          amount: atkDef.damage,
        })
        const newHp = target.hp - atkDef.damage
        if (newHp <= 0) {
          slots.delete(slotKey(target.slot))
          events.push({ kind: 'unit_destroyed', unitId: target.id })
        } else {
          slots.set(slotKey(target.slot), { ...target, hp: newHp })
        }

        // Record cooldown for used attack (store cooldown+1; see buildInitialCooldowns comment).
        if (atkDef.cooldown > 0) {
          const unitCds = cooldowns.get(unit.id) ?? new Map<AttackId, number>()
          unitCds.set(chosenAction.kind, atkDef.cooldown + 1)
          cooldowns.set(unit.id, unitCds)
        }
      }
    } else {
      events.push({ kind: 'action_used', unitId: unit.id, action: chosenAction, targets: [] })
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
    seed: rng.nextInt(0x100000000) + 1,
    finished: winner ?? false,
    cooldowns,
  }

  return { state: newState, events }
}
