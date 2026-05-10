// Tests for the Repair Bay node type + heal effect (T-6.11).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { applyRepairBay } from '../../src/logic/map/progression'
import { createRunState } from '../../src/logic/map/navigation'
import { HEAL_ALL_PCT } from '../../src/logic/rewards/apply'
import type { RunState } from '../../src/logic/map/types'
import { UnitInstance } from '../../src/logic/state/UnitInstance'

// ── Map placement ──────────────────────────────────────────────────────────

describe('generateMap: repair-bay placement', () => {
  it('places exactly 1 repair bay per map across 100 seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      const bays = map.nodes.filter(n => n.type === 'repair_bay')
      expect(bays).toHaveLength(1)
    }
  })

  it('never places a repair bay on the first or boss column', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      const bossCol = Math.max(...map.nodes.map(n => n.column))
      const bay = map.nodes.find(n => n.type === 'repair_bay')!
      expect(bay.column).toBeGreaterThanOrEqual(1)
      expect(bay.column).toBeLessThan(bossCol)
    }
  })

  it('never places the repair bay in a column that contains an elite', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      const eliteCols = new Set(map.nodes.filter(n => n.type === 'elite').map(n => n.column))
      const bay = map.nodes.find(n => n.type === 'repair_bay')!
      expect(eliteCols.has(bay.column)).toBe(false)
    }
  })

  it('biases repair bay toward the middle third on most seeds', () => {
    let inMiddle = 0
    const seeds = 100
    for (let seed = 0; seed < seeds; seed++) {
      const map = generateMap(createRng(seed))
      const numColumns = Math.max(...map.nodes.map(n => n.column)) + 1
      const middleStart = Math.floor(numColumns / 3)
      const middleEnd = Math.ceil((numColumns * 2) / 3)
      const bay = map.nodes.find(n => n.type === 'repair_bay')!
      if (bay.column >= middleStart && bay.column < middleEnd) inMiddle++
    }
    // The middle band is small but the placer prefers it; expect a strong
    // majority. Some seeds may fall through to the fallback when both elites
    // happen to occupy the middle band.
    expect(inMiddle).toBeGreaterThan(seeds * 0.7)
  })
})

// ── Heal effect ────────────────────────────────────────────────────────────

function makeRun(overrides?: Partial<RunState>): RunState {
  const map = generateMap(createRng(7))
  const u1 = new UnitInstance(
    'u1',
    'player',
    { side: 'player', row: 'front', column: 0 },
    'vacuum',
    50,
    [{ defId: 'quick_jab', cooldownRemaining: 0 }],
    [],
    [],
  )
  const u2 = new UnitInstance(
    'u2',
    'player',
    { side: 'player', row: 'front', column: 1 },
    'butler',
    20,
    [{ defId: 'taser', cooldownRemaining: 0 }],
    [],
    [],
  )
  const u3 = new UnitInstance(
    'u3',
    'player',
    { side: 'player', row: 'front', column: 2 },
    'lawnbot',
    0,
    [{ defId: 'mow', cooldownRemaining: 0 }],
    [],
    [],
  )
  const base = createRunState(map, [u1, u2, u3])
  return {
    ...base,
    hpSnapshot: { u1: 50, u2: 20, u3: 0 },
    ...overrides,
  }
}

describe('applyRepairBay', () => {
  it('heals every living unit by HEAL_ALL_PCT of maxHp, capped at maxHp', () => {
    const run = makeRun()
    const next = applyRepairBay(run)
    // u1 at 50, maxHp=70 (vacuum) → +ceil(70 * 0.5) = +35 → 70 (capped).
    expect(next.hpSnapshot.u1).toBe(Math.min(70, 50 + Math.ceil(70 * HEAL_ALL_PCT)))
    // u2 was 20, maxHp=70 (butler) → +ceil(70 * 0.5) = +35 → 55.
    expect(next.hpSnapshot.u2).toBe(20 + Math.ceil(70 * HEAL_ALL_PCT))
  })

  it('does not heal dead units (HP 0)', () => {
    const run = makeRun()
    const next = applyRepairBay(run)
    expect(next.hpSnapshot.u3).toBe(0)
  })

  it('does not heal sitting-out units (returning at 42% next fight)', () => {
    const run = makeRun({
      sittingOut: new Set(['u2']),
      hpSnapshot: { u1: 50, u2: 21, u3: 0 },
    })
    const next = applyRepairBay(run)
    expect(next.hpSnapshot.u2).toBe(21)
  })

  it('returns a new RunState, leaving the input untouched', () => {
    const run = makeRun()
    const next = applyRepairBay(run)
    expect(next).not.toBe(run)
    expect(run.hpSnapshot.u2).toBe(20)
  })
})
