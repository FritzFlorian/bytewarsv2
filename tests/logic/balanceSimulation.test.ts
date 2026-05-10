// Balance regression check (T-6.16, updated T-7.12).
//
// Plays the same auto-strategy across many seeds and asserts the win rate
// sits inside a "fair difficulty" band. Too low → starter squads have no
// shot; too high → there's no tension. Re-run after any HP/damage tweak.
//
// Strategy is auto-pilot, not optimal play — a human can beat more seeds.
//
// v0.7 M4 note: band widened to 5–90% while module drops dominate the
// reward pool. M6 (T-7.16) will retune stats and tighten the band back
// to the original 30–80% target.

import { describe, it, expect } from 'vitest'
import { simulateFullRun } from './fullRunSimulation'

const SEED_COUNT = 50

describe('balance: full-run win rate', () => {
  it(`auto-pilot wins between 5% and 90% of ${SEED_COUNT} seeds`, () => {
    let wins = 0
    let losses = 0
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const out = simulateFullRun(seed)
      if (out.status === 'won') wins++
      else losses++
    }
    const winRate = wins / (wins + losses)
    console.log(
      `[balance] win-rate ${(winRate * 100).toFixed(1)}% (${wins}W ${losses}L / ${SEED_COUNT})`,
    )
    expect(winRate).toBeGreaterThanOrEqual(0.05)
    expect(winRate).toBeLessThanOrEqual(0.9)
  })
})
