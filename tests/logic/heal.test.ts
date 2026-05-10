// Tests for heal actions (T-7.9).

import { describe, it, expect } from 'vitest'
import { UnitInstance } from '../../src/logic/state/UnitInstance'
import { createCombat, resolveRound } from '../../src/logic/combat/resolver'
import { resolveTarget } from '../../src/logic/gambits/interpreter'
import type { GambitList } from '../../src/logic/gambits/types'

function makeUnit(
  id: string,
  side: 'player' | 'enemy',
  hp: number,
  activeModuleIds: string[],
  gambits: GambitList,
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
  )
}

describe('heal action in combat', () => {
  it('heal module restores HP to a target ally', () => {
    // Player healer targets weakest ally
    const healer = makeUnit(
      'healer',
      'player',
      70,
      ['quick_patch', 'quick_jab'],
      [
        {
          condition: { kind: 'always' },
          action: { kind: 'quick_patch', target: 'weakest_ally' },
        },
      ],
      'back',
      0,
    )

    // Player tank at low HP
    const tank = makeUnit(
      'tank',
      'player',
      30,
      ['quick_jab'],
      [
        {
          condition: { kind: 'target_exists', target: 'nearest_enemy' },
          action: { kind: 'quick_jab', target: 'nearest_enemy' },
        },
      ],
      'front',
      0,
    )

    // Single enemy
    const enemy = makeUnit(
      'enemy-1',
      'enemy',
      100,
      ['clamp'],
      [
        {
          condition: { kind: 'target_exists', target: 'nearest_enemy' },
          action: { kind: 'clamp', target: 'nearest_enemy' },
        },
      ],
    )

    const state = createCombat(42, [healer, tank], [enemy])

    // Resolve one round — healer should heal the tank
    const result = resolveRound(state)
    const healEvents = result.events.filter(e => e.kind === 'unit_healed')

    expect(healEvents.length).toBeGreaterThanOrEqual(1)
    const healEvent = healEvents[0]
    if (healEvent.kind === 'unit_healed') {
      expect(healEvent.sourceId).toBe('healer')
      expect(healEvent.targetId).toBe('tank')
      expect(healEvent.amount).toBe(8) // quick_patch heals 8
    }
  })

  it('heal does not exceed maxHp', () => {
    // Healer at full HP targets itself (via 'self')
    const healer = makeUnit(
      'healer',
      'player',
      70, // maxHp for vacuum = 70
      ['quick_patch', 'quick_jab'],
      [
        {
          condition: { kind: 'always' },
          action: { kind: 'quick_patch', target: 'self' },
        },
      ],
    )

    const enemy = makeUnit(
      'enemy-1',
      'enemy',
      100,
      ['clamp'],
      [
        {
          condition: { kind: 'target_exists', target: 'nearest_enemy' },
          action: { kind: 'clamp', target: 'nearest_enemy' },
        },
      ],
    )

    const state = createCombat(42, [healer], [enemy])
    const result = resolveRound(state)

    // Healer is at full HP — heal should produce no unit_healed event
    // because actualHeal = min(8, 70-70) = 0
    const healEvents = result.events.filter(e => e.kind === 'unit_healed')
    expect(healEvents).toHaveLength(0)
  })
})

describe('ally target selectors', () => {
  it('any_ally resolves to a random living ally', () => {
    const unit1 = makeUnit('u1', 'player', 50, ['quick_jab'], [], 'front', 0)
    const unit2 = makeUnit('u2', 'player', 40, ['quick_jab'], [], 'front', 1)
    const unit3 = makeUnit('u3', 'player', 60, ['quick_jab'], [], 'front', 2)

    const bf = {
      slots: new Map([
        ['player-front-0', unit1],
        ['player-front-1', unit2],
        ['player-front-2', unit3],
      ]),
      round: 1,
    }

    // any_ally should not return self
    const target = resolveTarget('any_ally', unit1, bf)
    expect(target).not.toBeNull()
    expect(target!.id).not.toBe('u1')
    expect(['u2', 'u3']).toContain(target!.id)
  })

  it('weakest_ally resolves to the lowest-HP ally', () => {
    const unit1 = makeUnit('u1', 'player', 50, ['quick_jab'], [], 'front', 0)
    const unit2 = makeUnit('u2', 'player', 20, ['quick_jab'], [], 'front', 1)
    const unit3 = makeUnit('u3', 'player', 60, ['quick_jab'], [], 'front', 2)

    const bf = {
      slots: new Map([
        ['player-front-0', unit1],
        ['player-front-1', unit2],
        ['player-front-2', unit3],
      ]),
      round: 1,
    }

    const target = resolveTarget('weakest_ally', unit1, bf)
    expect(target).not.toBeNull()
    expect(target!.id).toBe('u2') // 20 HP is lowest
  })

  it('any_ally returns null when unit is alone', () => {
    const unit1 = makeUnit('u1', 'player', 50, ['quick_jab'], [], 'front', 0)

    const bf = {
      slots: new Map([['player-front-0', unit1]]),
      round: 1,
    }

    const target = resolveTarget('any_ally', unit1, bf)
    expect(target).toBeNull()
  })
})
