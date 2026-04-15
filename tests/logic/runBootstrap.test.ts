// Tests for the run-bootstrap path (T-6.12).
//
// The actual bootstrap orchestration lives in src/ui/App.tsx (it's a React
// state initializer, not a pure-logic export). These tests verify the *logic
// pieces* the bootstrap relies on: drawStarterSquad is deterministic on seed,
// and createRunState seeds ruleSlotsMap from the per-unit `ruleSlots` field.

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { createRunState } from '../../src/logic/map/navigation'
import { drawStarterSquad } from '../../src/logic/content/starterPresetLoader'
import type { Unit } from '../../src/logic/state/types'

function presetToUnit(presetIndex: number, p: ReturnType<typeof drawStarterSquad>[number]): Unit {
  return {
    id: `player-${p.id}`,
    side: 'player',
    slot: { side: 'player', row: 'front', column: presetIndex as 0 | 1 | 2 },
    chassis: p.chassis,
    hp: p.hp,
    maxHp: p.hp,
    gambits: p.gambits,
    ruleSlots: p.ruleSlots,
  }
}

describe('drawStarterSquad — deterministic bootstrap', () => {
  it('produces the same 2 presets for the same seed', () => {
    const a = drawStarterSquad(createRng(123), 2)
    const b = drawStarterSquad(createRng(123), 2)
    expect(a.map(p => p.id)).toEqual(b.map(p => p.id))
  })

  it('produces 2 starters at 70 HP / 2 rule slots each (post-T-6.16 balance)', () => {
    const presets = drawStarterSquad(createRng(42), 2)
    expect(presets).toHaveLength(2)
    for (const p of presets) {
      expect(p.hp).toBe(70)
      expect(p.ruleSlots).toBe(2)
    }
  })
})

describe('createRunState seeds ruleSlotsMap from unit.ruleSlots (T-6.12)', () => {
  it('reads the per-unit ruleSlots field when present', () => {
    const presets = drawStarterSquad(createRng(7), 2)
    const units = presets.map((p, i) => presetToUnit(i, p))
    const map = generateMap(createRng(7))
    const run = createRunState(map, units)
    for (const u of units) {
      expect(run.ruleSlotsMap[u.id]).toBe(u.ruleSlots)
    }
  })

  it('falls back to the default of 2 when ruleSlots is omitted on a unit', () => {
    const map = generateMap(createRng(7))
    const u: Unit = {
      id: 'legacy',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 0 },
      chassis: 'vacuum',
      hp: 80,
      maxHp: 80,
      gambits: [],
      // ruleSlots intentionally omitted — older fixtures predate the field.
    }
    const run = createRunState(map, [u])
    expect(run.ruleSlotsMap['legacy']).toBe(2)
  })

  it('honors a non-default ruleSlots value (e.g. a unit that already received +1 reward)', () => {
    const map = generateMap(createRng(7))
    const u: Unit = {
      id: 'boosted',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 0 },
      chassis: 'butler',
      hp: 50,
      maxHp: 50,
      gambits: [],
      ruleSlots: 4,
    }
    const run = createRunState(map, [u])
    expect(run.ruleSlotsMap['boosted']).toBe(4)
  })
})
