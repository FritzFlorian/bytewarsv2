// Combat resolver for Bytewars v0.7.
//
// v0.7 changes:
//   - Damage comes from active module definitions on the unit (+ bonusDamage
//     from passive modules), not from a global attacks.json lookup.
//   - Cooldowns live on ActiveModuleInstance, not a separate CooldownMap.
//   - Units are cloned at round start so mutations are local to this round.
//   - CombatState no longer carries a cooldowns field.

import type { Unit, Battlefield, CombatState, SlotMap, Side } from '../state/types'
import { slotKey, ROW_ORDER } from '../state/types'
import type { CombatEvent } from './events'
import { chooseRule, resolveTarget } from '../gambits/interpreter'
import { isModuleAction } from '../gambits/types'
import { createRng } from '../rng'
import { getActiveModuleDef } from '../content/moduleLoader'

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createCombat(seed: number, playerUnits: Unit[], enemyUnits: Unit[]): CombatState {
  const allUnits = [...playerUnits, ...enemyUnits]
  const slots: SlotMap = new Map()
  for (const unit of allUnits) {
    // Clone each unit so combat mutations don't affect the caller's objects.
    const clone = unit.clone()
    clone.applyInitialCooldowns()
    slots.set(slotKey(clone.slot), clone)
  }
  return { battlefield: { slots, round: 1 }, seed, finished: false }
}

export function isCombatOver(state: CombatState): false | 'player' | 'enemy' {
  return checkWinner(state.battlefield.slots) ?? false
}

export function resolveRound(state: CombatState): { state: CombatState; events: CombatEvent[] } {
  const events: CombatEvent[] = []
  const rng = createRng(state.seed)

  // Deep-clone all units so mutations this round don't affect the original state.
  const slots: SlotMap = new Map()
  for (const [key, unit] of state.battlefield.slots) {
    slots.set(key, unit.clone())
  }
  const round = state.battlefield.round

  events.push({ kind: 'round_started', round })

  // Tick cooldowns on all units at the start of each round.
  for (const unit of slots.values()) {
    unit.tickCooldowns()
  }

  const turnOrder = buildTurnOrder(slots)

  for (const unitSnapshot of turnOrder) {
    const unit = slots.get(slotKey(unitSnapshot.slot))
    if (!unit) continue

    const bf: Battlefield = { slots, round }

    events.push({ kind: 'turn_started', unitId: unit.id })

    // Delegate gambit walk to the interpreter (module-aware in v0.7).
    const { ruleIndex: chosenRuleIndex, action: chosenAction } = chooseRule(unit, bf)

    events.push({ kind: 'rule_fired', unitId: unit.id, ruleIndex: chosenRuleIndex })

    if (isModuleAction(chosenAction)) {
      const modDef = getActiveModuleDef(chosenAction.kind)
      const target = resolveTarget(chosenAction.target, unit, bf, rng)
      const targetIds = target ? [target.id] : []
      events.push({
        kind: 'action_used',
        unitId: unit.id,
        action: chosenAction,
        targets: targetIds,
      })

      if (target) {
        if (modDef.actionKind === 'attack') {
          // Attack: deal damage to the target
          const damage = modDef.attackProperties.damage + unit.bonusDamage
          events.push({
            kind: 'damage_dealt',
            sourceId: unit.id,
            targetId: target.id,
            amount: damage,
          })
          const newHp = target.hp - damage
          if (newHp <= 0) {
            slots.delete(slotKey(target.slot))
            events.push({ kind: 'unit_destroyed', unitId: target.id })
          } else {
            target.hp = newHp
          }
        } else if (modDef.actionKind === 'heal') {
          // Heal: restore HP to the target, capped at maxHp
          const healAmount = modDef.healProperties.healAmount
          const actualHeal = Math.min(healAmount, target.maxHp - target.hp)
          if (actualHeal > 0) {
            target.hp += actualHeal
            events.push({
              kind: 'unit_healed',
              sourceId: unit.id,
              targetId: target.id,
              amount: actualHeal,
            })
          }
        }

        // Record cooldown on the module instance
        unit.setCooldownAfterUse(chosenAction.kind)
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
  }

  return { state: newState, events }
}
