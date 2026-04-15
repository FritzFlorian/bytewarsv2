import { describe, it, expect } from 'vitest'
import { walkingSkeletonFixture } from '../../src/logic/content/fixtures'
import type { Condition } from '../../src/logic/gambits/types'
import { isAttackAction } from '../../src/logic/gambits/types'

// V0.1 vocabulary constraints
const VALID_CONDITION_KINDS: Condition['kind'][] = ['always', 'self_hp_below', 'target_exists']
const VALID_TARGET_SELECTORS = ['self', 'nearest_enemy', 'any_enemy'] as const

describe('walkingSkeletonFixture', () => {
  const { playerUnits, enemyUnits } = walkingSkeletonFixture()

  it('returns exactly 2 player units and 2 enemy units', () => {
    expect(playerUnits).toHaveLength(2)
    expect(enemyUnits).toHaveLength(2)
  })

  it('player units have 80 HP (per Q-V0.1-2)', () => {
    for (const unit of playerUnits) {
      expect(unit.hp).toBe(80)
      expect(unit.maxHp).toBe(80)
    }
  })

  it('enemy units have 40 HP (T-6.16 balance pass)', () => {
    for (const unit of enemyUnits) {
      expect(unit.hp).toBe(40)
      expect(unit.maxHp).toBe(40)
    }
  })

  it('all units are on the correct side', () => {
    for (const unit of playerUnits) {
      expect(unit.side).toBe('player')
      expect(unit.slot.side).toBe('player')
    }
    for (const unit of enemyUnits) {
      expect(unit.side).toBe('enemy')
      expect(unit.slot.side).toBe('enemy')
    }
  })

  it('all unit IDs are unique', () => {
    const allUnits = [...playerUnits, ...enemyUnits]
    const ids = allUnits.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all gambits use only v0.1 condition kinds', () => {
    for (const unit of [...playerUnits, ...enemyUnits]) {
      for (const rule of unit.gambits) {
        expect(VALID_CONDITION_KINDS).toContain(rule.condition.kind)
      }
    }
  })

  it('all gambits use only named attack IDs or idle', () => {
    for (const unit of [...playerUnits, ...enemyUnits]) {
      for (const rule of unit.gambits) {
        // Every action is either a named attack or idle — no generic 'attack'
        const validKinds = [
          'quick_jab',
          'sweep',
          'taser',
          'overload',
          'clamp',
          'suppression',
          'idle',
        ]
        expect(validKinds).toContain(rule.action.kind)
      }
    }
  })

  it('all target selectors in gambits are valid v0.1 selectors', () => {
    for (const unit of [...playerUnits, ...enemyUnits]) {
      for (const rule of unit.gambits) {
        if (rule.condition.kind === 'target_exists') {
          expect(VALID_TARGET_SELECTORS).toContain(rule.condition.target)
        }
        if (isAttackAction(rule.action)) {
          expect(VALID_TARGET_SELECTORS).toContain(rule.action.target)
        }
      }
    }
  })

  it('each unit has at least one gambit rule', () => {
    for (const unit of [...playerUnits, ...enemyUnits]) {
      expect(unit.gambits.length).toBeGreaterThan(0)
    }
  })

  it('each unit slot column is a valid Column value (0 | 1 | 2)', () => {
    for (const unit of [...playerUnits, ...enemyUnits]) {
      expect([0, 1, 2]).toContain(unit.slot.column)
    }
  })
})
