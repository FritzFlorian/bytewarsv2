import { expect, test } from 'vitest'
import type { CombatState } from '../../src/logic/state/types'
import { UnitInstance } from '../../src/logic/state/UnitInstance'

test('T-1.1: CombatState literal compiles and is well-formed', () => {
  const unit = new UnitInstance(
    'u1',
    'player',
    { side: 'player', row: 'front', column: 0 },
    'vacuum',
    80,
    [{ defId: 'quick_jab', cooldownRemaining: 0 }],
    [],
    [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
  )

  const state: CombatState = {
    battlefield: {
      slots: new Map([['player-front-0', unit]]),
      round: 1,
    },
    seed: 42,
    finished: false,
  }

  expect(state.finished).toBe(false)
  expect(state.battlefield.slots.size).toBe(1)
  expect(state.seed).toBe(42)
})
