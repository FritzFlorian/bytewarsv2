import { expect, test } from 'vitest'
import { createCombat, resolveRound, isCombatOver } from '../../src/logic/index'

test('T-1.5: createCombat throws "not implemented" stub message', () => {
  expect(() => createCombat(1, [], [])).toThrow('not implemented (T-2A.3)')
})

test('T-1.5: resolveRound throws "not implemented" stub message', () => {
  const fakeState = {} as Parameters<typeof resolveRound>[0]
  expect(() => resolveRound(fakeState)).toThrow('not implemented (T-2A.3)')
})

test('T-1.5: isCombatOver throws "not implemented" stub message', () => {
  const fakeState = {} as Parameters<typeof isCombatOver>[0]
  expect(() => isCombatOver(fakeState)).toThrow('not implemented (T-2A.3)')
})
