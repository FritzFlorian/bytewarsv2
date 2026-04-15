// Balance regression check (T-6.16).
//
// Plays the same auto-strategy across many seeds and asserts the win rate
// sits inside a "fair difficulty" band. Too low → starter squads have no
// shot; too high → there's no tension. Re-run after any HP/damage tweak.
//
// Strategy is auto-pilot, not optimal play — a human can beat more seeds.

import { describe, it, expect } from 'vitest'
import { simulateFullRun } from './fullRunSimulation'

const SEED_COUNT = 50

describe('balance: full-run win rate', () => {
  it(`auto-pilot wins between 30% and 80% of ${SEED_COUNT} seeds`, () => {
    let wins = 0
    let losses = 0
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const out = simulateFullRun(seed)
      if (out.status === 'won') wins++
      else losses++
    }
    const winRate = wins / (wins + losses)
    // Logged so balance changes are visible in test output.
    console.log(
      `[balance] win-rate ${(winRate * 100).toFixed(1)}% (${wins}W ${losses}L / ${SEED_COUNT})`,
    )
    expect(winRate).toBeGreaterThanOrEqual(0.3)
    expect(winRate).toBeLessThanOrEqual(0.8)
  })
})
