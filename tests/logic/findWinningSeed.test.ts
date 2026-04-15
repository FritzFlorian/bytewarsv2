// Pins the seed used by the reward-flow e2e spec (tests/e2e/reward-flow).
//
// The e2e boots the app with `?seed=1` and expects the player to WIN the
// first combat so the reward screen appears. If balance changes ever flip
// seed 1 into a loss, this test fails — update the e2e's pinned seed to
// the next player-winning seed (re-run `findWinningSeed.log` if needed).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { drawStarterSquad } from '../../src/logic/content/starterPresetLoader'
import { walkingSkeletonFixture } from '../../src/logic/content/fixtures'
import { createCombat, resolveRound, isCombatOver } from '../../src/logic/combat/resolver'
import type { Unit } from '../../src/logic/state/types'

const STARTER_COLUMNS = [0, 1, 2] as const
const E2E_SEED = 1

function simulate(seed: number): 'player' | 'enemy' {
  const rng = createRng(seed)
  const presets = drawStarterSquad(rng, 2)
  const playerUnits: Unit[] = presets.map((p, i) => ({
    id: `player-${p.id}`,
    side: 'player',
    slot: { side: 'player', row: 'front', column: STARTER_COLUMNS[i] },
    chassis: p.chassis,
    hp: p.hp,
    maxHp: p.hp,
    gambits: p.gambits,
    ruleSlots: p.ruleSlots,
  }))
  const enemyUnits = walkingSkeletonFixture().enemyUnits

  let state = createCombat(seed, playerUnits, enemyUnits)
  let guard = 0
  while (!isCombatOver(state)) {
    if (++guard > 200) return 'enemy'
    state = resolveRound(state).state
  }
  return state.finished === 'player' ? 'player' : 'enemy'
}

describe('e2e reward-flow seed pin', () => {
  it(`seed ${E2E_SEED} is still a player win`, () => {
    expect(simulate(E2E_SEED)).toBe('player')
  })
})
