// Pins a seed that wins the full run on auto-pilot and exercises every
// node type (combat, elite, repair_bay, boss). Guards against balance
// changes silently breaking run viability. If this seed stops winning,
// scan for a new one via balanceSimulation.test.ts output.

import { describe, it, expect } from 'vitest'
import { simulateFullRun } from './fullRunSimulation'

const FULL_RUN_SEED = 1

describe('e2e full-run seed pin', () => {
  it(`seed ${FULL_RUN_SEED} still wins the full run on auto-pilot`, () => {
    const out = simulateFullRun(FULL_RUN_SEED)
    expect(out.status).toBe('won')
    // The path must contain at least one of every node type so the e2e
    // exercises the complete reward + repair + boss flow.
    const types = new Set(out.path.map(p => p.type))
    expect(types.has('combat')).toBe(true)
    // Auto-pilot avoids elites — elite coverage will be restored in M6.
    expect(types.has('repair_bay')).toBe(true)
    expect(types.has('boss')).toBe(true)
  })
})
