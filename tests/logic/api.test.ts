// T-1.5 verified that the symbols existed as stubs; T-2A.3 replaced the stubs
// with real implementations. These tests now verify the public API contract
// through the logic/index.ts boundary.

import { expect, test } from 'vitest'
import { createCombat, resolveRound, isCombatOver } from '../../src/logic/index'
import { walkingSkeletonFixture } from '../../src/logic/content/fixtures'

const { playerUnits, enemyUnits } = walkingSkeletonFixture()

test('createCombat returns a CombatState with the correct number of units', () => {
  const state = createCombat(42, playerUnits, enemyUnits)
  expect(state.battlefield.slots.size).toBe(4)
  expect(state.finished).toBe(false)
})

test('resolveRound returns events and advances the round', () => {
  const state = createCombat(42, playerUnits, enemyUnits)
  const { state: next, events } = resolveRound(state)
  expect(events.length).toBeGreaterThan(0)
  expect(next.battlefield.round).toBe(2)
})

test('isCombatOver returns false when both sides are alive', () => {
  const state = createCombat(42, playerUnits, enemyUnits)
  expect(isCombatOver(state)).toBe(false)
})
