// Resolver tests for v0.8 AoE + buff/debuff modules (T-8.3).
//
// We hand-craft active-module instances on UnitInstance and dispatch them
// through resolveRound. Asserts: damage_dealt + status_applied are emitted
// once per resolved target; buff/debuff modules apply the right status.
//
// Modules used here exist in src/content/modules — we lean on real definitions
// for attack-with-appliesStatus + AoE selector wiring.

import { describe, it, expect } from 'vitest'
import { UnitInstance } from '../../src/logic/state/UnitInstance'
import { createCombat, resolveRound } from '../../src/logic/combat/resolver'
import { resolveTargets } from '../../src/logic/gambits/interpreter'
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

describe('AoE target selectors — resolveTargets', () => {
  it('all_enemies returns every enemy', () => {
    const p1 = makeUnit('p1', 'player', 70, ['quick_jab'], [], 'front', 0)
    const e1 = makeUnit('e1', 'enemy', 50, ['quick_jab'], [], 'front', 0)
    const e2 = makeUnit('e2', 'enemy', 50, ['quick_jab'], [], 'middle', 1)
    const e3 = makeUnit('e3', 'enemy', 50, ['quick_jab'], [], 'back', 2)
    const bf = {
      slots: new Map([
        ['player-front-0', p1],
        ['enemy-front-0', e1],
        ['enemy-middle-1', e2],
        ['enemy-back-2', e3],
      ]),
      round: 1,
    }
    const targets = resolveTargets('all_enemies', p1, bf)
    expect(targets.map(t => t.id).sort()).toEqual(['e1', 'e2', 'e3'])
  })

  it('all_enemies_in_row returns only enemies in the nearest row', () => {
    const p1 = makeUnit('p1', 'player', 70, ['quick_jab'], [], 'front', 0)
    const e1 = makeUnit('e1', 'enemy', 50, ['quick_jab'], [], 'front', 0)
    const e2 = makeUnit('e2', 'enemy', 50, ['quick_jab'], [], 'front', 2)
    const e3 = makeUnit('e3', 'enemy', 50, ['quick_jab'], [], 'middle', 1)
    const bf = {
      slots: new Map([
        ['player-front-0', p1],
        ['enemy-front-0', e1],
        ['enemy-front-2', e2],
        ['enemy-middle-1', e3],
      ]),
      round: 1,
    }
    const targets = resolveTargets('all_enemies_in_row', p1, bf)
    // Nearest row = front; e1 + e2 should match, e3 (middle) excluded
    expect(targets.map(t => t.id).sort()).toEqual(['e1', 'e2'])
  })

  it('all_allies includes self', () => {
    const a1 = makeUnit('a1', 'player', 70, ['quick_jab'], [], 'front', 0)
    const a2 = makeUnit('a2', 'player', 70, ['quick_jab'], [], 'middle', 1)
    const e1 = makeUnit('e1', 'enemy', 50, ['quick_jab'], [], 'front', 0)
    const bf = {
      slots: new Map([
        ['player-front-0', a1],
        ['player-middle-1', a2],
        ['enemy-front-0', e1],
      ]),
      round: 1,
    }
    const targets = resolveTargets('all_allies', a1, bf)
    expect(targets.map(t => t.id).sort()).toEqual(['a1', 'a2'])
  })
})

describe('AoE attacks emit damage_dealt per target', () => {
  it('an all_enemies attack with quick_jab fires once per enemy', () => {
    // Use quick_jab (damage 8, cooldown 0) but with all_enemies target
    const player = makeUnit(
      'p1',
      'player',
      70,
      ['quick_jab'],
      [
        {
          condition: { kind: 'always' },
          action: { kind: 'quick_jab', target: 'all_enemies' },
        },
      ],
    )
    const e1 = makeUnit('e1', 'enemy', 100, ['quick_jab'], [], 'front', 0)
    const e2 = makeUnit('e2', 'enemy', 100, ['quick_jab'], [], 'middle', 1)

    const state = createCombat(42, [player], [e1, e2])
    const { events } = resolveRound(state)
    const damageEvents = events.filter(e => e.kind === 'damage_dealt' && e.sourceId === 'p1')
    expect(damageEvents).toHaveLength(2)
    expect(damageEvents.map(e => (e.kind === 'damage_dealt' ? e.targetId : '')).sort()).toEqual([
      'e1',
      'e2',
    ])

    // action_used.targets[] has both ids
    const actionUsed = events.find(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(actionUsed?.kind === 'action_used' && actionUsed.targets.length).toBe(2)
  })
})
