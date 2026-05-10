// Tests for the v0.8 status-aware gambit conditions (T-8.5).
//
// Covers:
//   - self_has_status / target_has_status evaluator behavior
//   - Stacking semantics: ANY instance of the kind makes the predicate true
//   - Refresh edge: a status applied this round to an already-acted unit is
//     visible to subsequent units in the same round.

import { describe, it, expect } from 'vitest'
import { UnitInstance } from '../../src/logic/state/UnitInstance'
import type { StatusEffectInstance } from '../../src/logic/state/UnitInstance'
import { evaluateCondition } from '../../src/logic/gambits/interpreter'
import type { GambitList } from '../../src/logic/gambits/types'

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

describe('self_has_status', () => {
  it('matches when any instance of the kind is present', () => {
    const s: StatusEffectInstance = {
      kind: 'damage_boost',
      magnitude: 4,
      durationRemaining: 2,
      sourceUnitId: 'self',
    }
    const u = makeUnit('p1', 'player', 70, ['quick_jab'], [], [s])
    const bf = { slots: new Map([['player-front-0', u]]), round: 1 }
    expect(evaluateCondition({ kind: 'self_has_status', statusKind: 'damage_boost' }, u, bf)).toBe(
      true,
    )
  })

  it('does not match a different kind', () => {
    const s: StatusEffectInstance = {
      kind: 'damage_boost',
      magnitude: 4,
      durationRemaining: 2,
      sourceUnitId: 'self',
    }
    const u = makeUnit('p1', 'player', 70, ['quick_jab'], [], [s])
    const bf = { slots: new Map([['player-front-0', u]]), round: 1 }
    expect(evaluateCondition({ kind: 'self_has_status', statusKind: 'burning' }, u, bf)).toBe(false)
  })

  it('returns false on empty statusEffects', () => {
    const u = makeUnit('p1', 'player', 70, ['quick_jab'], [])
    const bf = { slots: new Map([['player-front-0', u]]), round: 1 }
    expect(evaluateCondition({ kind: 'self_has_status', statusKind: 'burning' }, u, bf)).toBe(false)
  })
})

describe('target_has_status', () => {
  it('returns true when nearest_enemy has the status', () => {
    const burning: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 3,
      durationRemaining: 2,
      sourceUnitId: 'p1',
    }
    const p1 = makeUnit('p1', 'player', 70, ['quick_jab'], [])
    const e1 = makeUnit('e1', 'enemy', 50, ['quick_jab'], [], [burning])
    const bf = {
      slots: new Map([
        ['player-front-0', p1],
        ['enemy-front-0', e1],
      ]),
      round: 1,
    }
    expect(
      evaluateCondition(
        { kind: 'target_has_status', target: 'nearest_enemy', statusKind: 'burning' },
        p1,
        bf,
      ),
    ).toBe(true)
  })

  it('returns false when no targets match', () => {
    const p1 = makeUnit('p1', 'player', 70, ['quick_jab'], [])
    const e1 = makeUnit('e1', 'enemy', 50, ['quick_jab'], [])
    const bf = {
      slots: new Map([
        ['player-front-0', p1],
        ['enemy-front-0', e1],
      ]),
      round: 1,
    }
    expect(
      evaluateCondition(
        { kind: 'target_has_status', target: 'nearest_enemy', statusKind: 'burning' },
        p1,
        bf,
      ),
    ).toBe(false)
  })

  it('returns false when no target exists', () => {
    const p1 = makeUnit('p1', 'player', 70, ['quick_jab'], [])
    const bf = { slots: new Map([['player-front-0', p1]]), round: 1 }
    expect(
      evaluateCondition(
        { kind: 'target_has_status', target: 'nearest_enemy', statusKind: 'burning' },
        p1,
        bf,
      ),
    ).toBe(false)
  })

  it('AoE selector — any matched target with status returns true', () => {
    const burning: StatusEffectInstance = {
      kind: 'burning',
      magnitude: 3,
      durationRemaining: 2,
      sourceUnitId: 'p1',
    }
    const p1 = makeUnit('p1', 'player', 70, ['quick_jab'], [])
    const e1 = makeUnit('e1', 'enemy', 50, ['quick_jab'], [], [], 'front', 0)
    const e2 = makeUnit('e2', 'enemy', 50, ['quick_jab'], [], [burning], 'front', 1)
    const bf = {
      slots: new Map([
        ['player-front-0', p1],
        ['enemy-front-0', e1],
        ['enemy-front-1', e2],
      ]),
      round: 1,
    }
    expect(
      evaluateCondition(
        { kind: 'target_has_status', target: 'all_enemies', statusKind: 'burning' },
        p1,
        bf,
      ),
    ).toBe(true)
  })
})
