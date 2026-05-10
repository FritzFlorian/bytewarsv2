// Balance smoke test.
//
// Plays an auto-pilot strategy across many seeds and logs the win rate.
// The auto-pilot is not a skilled player — it just picks the first
// available option at every decision point. The win rate is informational,
// not a hard gate: we only fail on degenerate extremes (0% or 100%)
// which indicate something is fundamentally broken.
//
// Run `pnpm test -- tests/logic/balanceSimulation.test.ts` after any
// HP/damage tweak to eyeball whether the numbers still feel right.

import { describe, it, expect } from 'vitest'
import { simulateFullRun } from './fullRunSimulation'

const SEED_COUNT = 50

describe('balance: full-run smoke test', () => {
  it(`auto-pilot can complete ${SEED_COUNT} seeds without crashing`, () => {
    let wins = 0
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const out = simulateFullRun(seed)
      if (out.status === 'won') wins++
    }
    const winRate = wins / SEED_COUNT
    console.log(
      `[balance] win-rate ${(winRate * 100).toFixed(1)}% (${wins}W ${SEED_COUNT - wins}L / ${SEED_COUNT})`,
    )
    // Only fail on degenerate extremes — everything else is informational.
    expect(winRate).toBeGreaterThan(0)
    expect(winRate).toBeLessThan(1)
  })
})
