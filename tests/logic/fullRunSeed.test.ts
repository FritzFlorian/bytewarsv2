// Pins the seed used by the full-run e2e (tests/e2e/full-run.spec.ts).
//
// The e2e boots the app with `?seed=10` and walks repair_bay > combat >
// elite > boss until victory. If a balance change ever flips this seed
// into a loss, this test fails — pick the next winning varied-path seed
// from balanceSimulation.test.ts output and update both files.

import { describe, it, expect } from 'vitest'
import { simulateFullRun } from './fullRunSimulation'

const FULL_RUN_SEED = 10

describe('e2e full-run seed pin', () => {
  it(`seed ${FULL_RUN_SEED} still wins the full run on auto-pilot`, () => {
    const out = simulateFullRun(FULL_RUN_SEED)
    expect(out.status).toBe('won')
    // The path must contain at least one of every node type so the e2e
    // exercises the complete reward + repair + boss flow.
    const types = new Set(out.path.map(p => p.type))
    expect(types.has('combat')).toBe(true)
    expect(types.has('elite')).toBe(true)
    expect(types.has('repair_bay')).toBe(true)
    expect(types.has('boss')).toBe(true)
  })
})
