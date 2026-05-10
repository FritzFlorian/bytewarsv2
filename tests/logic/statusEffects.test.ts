// Golden tests for the v0.8 status-effect engine (T-8.2).
//
// These tests author statuses by hand on UnitInstance objects (no module
// schema yet — that lands in T-8.3) and assert the event-log shape across
// rounds. They cover: burning DoT tick + expiry, damage_boost folding into
// bonusDamage, disabled forcing idle, stacking of independent instances.

import { describe, it, expect } from 'vitest'
import { UnitInstance } from '../../src/logic/state/UnitInstance'
import type { StatusEffectInstance } from '../../src/logic/state/UnitInstance'
import { createCombat, resolveRound } from '../../src/logic/combat/resolver'
import type { GambitList } from '../../src/logic/gambits/types'
import type { CombatEvent } from '../../src/logic/combat/events'

function makeUnit(
  id: string,
  side: 'player' | 'enemy',
  hp: number,
  activeModuleIds: string[],
  gambits: GambitList,
  statusEffects: StatusEffectInstance[] = [],
  row: 'front' | 'middle' | 'back' = 'front',
  column: 0 | 1 | 2 = 0,
): UnitInstance {
  return new UnitInstance(
    id,
    side,
    { side, row, column },
    side === 'player' ? 'vacuum' : 'qa-rig',
    hp,
    activeModuleIds.map(defId => ({ defId, cooldownRemaining: 0 })),
    [],
    gambits,
    statusEffects,
  )
}

const idleGambits: GambitList = [{ condition: { kind: 'always' }, action: { kind: 'idle' } }]

const attackGambits: GambitList = [
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'quick_jab', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

describe('status engine — burning (DoT)', () => {
  it('emits status_tick_damage at start of affected unit turn and decrements HP', () => {
    const burning: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 5,
      durationRemaining: 2,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], idleGambits)
    const enemy = makeUnit('e1', 'enemy', 50, ['quick_jab'], idleGambits, [burning])

    const state = createCombat(42, [player], [enemy])
    const { events, state: next } = resolveRound(state)

    const tick = events.find(e => e.kind === 'status_tick_damage' && e.unitId === 'e1') as
      | Extract<CombatEvent, { kind: 'status_tick_damage' }>
      | undefined
    expect(tick).toBeDefined()
    expect(tick!.amount).toBe(5)
    expect(tick!.statusKind).toBe('burning')

    const enemyAfter = next.battlefield.slots.get('enemy-front-0')
    expect(enemyAfter?.hp).toBe(45)
    // duration decremented (2 → 1) at end of turn
    expect(enemyAfter?.statusEffects.length).toBe(1)
    expect(enemyAfter?.statusEffects[0].durationRemaining).toBe(1)
  })

  it('emits status_expired when duration hits 0 and removes the status', () => {
    const burning: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 3,
      durationRemaining: 1,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], idleGambits)
    const enemy = makeUnit('e1', 'enemy', 50, ['quick_jab'], idleGambits, [burning])

    const state = createCombat(42, [player], [enemy])
    const { events, state: next } = resolveRound(state)

    const expired = events.find(e => e.kind === 'status_expired' && e.unitId === 'e1')
    expect(expired).toBeDefined()
    const enemyAfter = next.battlefield.slots.get('enemy-front-0')
    expect(enemyAfter?.statusEffects.length).toBe(0)
  })

  it('skips the unit turn (and end-tick) when DoT kills the target', () => {
    const burning: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 99,
      durationRemaining: 2,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], idleGambits)
    const enemy = makeUnit('e1', 'enemy', 10, ['quick_jab'], attackGambits, [burning])

    const state = createCombat(42, [player], [enemy])
    const { events } = resolveRound(state)

    // Enemy was destroyed by DoT before any action_used
    const turnStarted = events.find(e => e.kind === 'turn_started' && e.unitId === 'e1')
    const destroyed = events.find(e => e.kind === 'unit_destroyed' && e.unitId === 'e1')
    const actionUsed = events.find(e => e.kind === 'action_used' && e.unitId === 'e1')

    expect(turnStarted).toBeDefined()
    expect(destroyed).toBeDefined()
    expect(actionUsed).toBeUndefined()
    // No status_expired after death because the unit is gone before end-tick
    const expired = events.find(e => e.kind === 'status_expired' && e.unitId === 'e1')
    expect(expired).toBeUndefined()
  })
})

describe('status engine — damage_boost', () => {
  it('folds into bonusDamage and increases outgoing damage', () => {
    const boost: StatusEffectInstance = {
      kind: 'damage_boost',
      magnitude: 4,
      durationRemaining: 3,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], attackGambits, [boost])
    const enemy = makeUnit('e1', 'enemy', 9999, ['quick_jab'], idleGambits)

    expect(player.bonusDamage).toBe(4)

    const state = createCombat(42, [player], [enemy])
    const { events } = resolveRound(state)
    const dmg = events.find(e => e.kind === 'damage_dealt' && e.sourceId === 'p1') as
      | Extract<CombatEvent, { kind: 'damage_dealt' }>
      | undefined
    // quick_jab base damage 8 + boost 4 = 12
    expect(dmg?.amount).toBe(12)
  })

  it('stacks additively across independent instances', () => {
    const boost1: StatusEffectInstance = {
      kind: 'damage_boost',
      magnitude: 3,
      durationRemaining: 2,
      sourceUnitId: 'p1',
    }
    const boost2: StatusEffectInstance = {
      kind: 'damage_boost',
      magnitude: 5,
      durationRemaining: 2,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], attackGambits, [boost1, boost2])
    expect(player.bonusDamage).toBe(8)
  })
})

describe('status engine — disabled', () => {
  it('forces idle action and still ticks duration', () => {
    const disabled: StatusEffectInstance = {
      kind: 'disabled',
      magnitude: 0,
      durationRemaining: 1,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], attackGambits, [disabled])
    const enemy = makeUnit('e1', 'enemy', 9999, ['quick_jab'], idleGambits)

    expect(player.isDisabled()).toBe(true)

    const state = createCombat(42, [player], [enemy])
    const { events, state: next } = resolveRound(state)

    // Player's action_used must be idle even though attackGambits would otherwise fire.
    const playerAction = events.find(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(playerAction).toBeDefined()
    if (playerAction?.kind === 'action_used') {
      expect(playerAction.action.kind).toBe('idle')
    }
    // No damage dealt
    expect(events.find(e => e.kind === 'damage_dealt')).toBeUndefined()

    // Duration ticked to 0 and status expired.
    const expired = events.find(e => e.kind === 'status_expired' && e.unitId === 'p1')
    expect(expired).toBeDefined()
    const playerAfter = next.battlefield.slots.get('player-front-0')
    expect(playerAfter?.statusEffects.length).toBe(0)
  })
})

describe('status engine — stacking semantics', () => {
  it('two burning instances tick separately', () => {
    const b1: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 2,
      durationRemaining: 1,
      sourceUnitId: 'p1',
    }
    const b2: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 3,
      durationRemaining: 1,
      sourceUnitId: 'p1',
    }
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], idleGambits)
    const enemy = makeUnit('e1', 'enemy', 50, ['quick_jab'], idleGambits, [b1, b2])

    const state = createCombat(42, [player], [enemy])
    const { events, state: next } = resolveRound(state)

    const ticks = events.filter(e => e.kind === 'status_tick_damage' && e.unitId === 'e1')
    // Two separate tick events
    expect(ticks).toHaveLength(2)
    const enemyAfter = next.battlefield.slots.get('enemy-front-0')
    expect(enemyAfter?.hp).toBe(50 - 2 - 3)
    // Both expired (duration was 1 → 0)
    const expiries = events.filter(e => e.kind === 'status_expired' && e.unitId === 'e1')
    expect(expiries).toHaveLength(2)
    expect(enemyAfter?.statusEffects.length).toBe(0)
  })
})

describe('status engine — applyStatus and clone', () => {
  it('applyStatus appends a copy and clone() deep-copies the array', () => {
    const player = makeUnit('p1', 'player', 70, ['quick_jab'], idleGambits)
    const burning: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 4,
      durationRemaining: 2,
      sourceUnitId: 'e1',
    }
    player.applyStatus(burning)
    expect(player.statusEffects).toHaveLength(1)

    const copy = player.clone()
    expect(copy.statusEffects).toHaveLength(1)

    // Mutating clone must not affect original
    copy.statusEffects[0].durationRemaining = 0
    expect(player.statusEffects[0].durationRemaining).toBe(2)
  })
})
