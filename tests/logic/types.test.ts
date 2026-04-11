import { expect, test } from 'vitest'
import type { CombatState } from '../../src/logic/state/types'

test('T-1.1: CombatState literal compiles and is well-formed', () => {
  const state: CombatState = {
    battlefield: {
      slots: new Map([
        [
          'player-front-0',
          {
            id: 'u1',
            side: 'player',
            slot: { side: 'player', row: 'front', column: 0 },
            chassis: 'vacuum',
            hp: 80,
            maxHp: 80,
            gambits: [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
          },
        ],
      ]),
      round: 1,
    },
    seed: 42,
    finished: false,
    cooldowns: new Map(),
  }

  expect(state.finished).toBe(false)
  expect(state.battlefield.slots.size).toBe(1)
  expect(state.seed).toBe(42)
})
