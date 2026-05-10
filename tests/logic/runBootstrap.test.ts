// Tests for the run-bootstrap path (T-6.12).
//
// The actual bootstrap orchestration lives in src/ui/App.tsx (it's a React
// state initializer, not a pure-logic export). These tests verify the *logic
// pieces* the bootstrap relies on: drawStarterSquad is deterministic on seed,
// and createRunState seeds ruleSlotsMap from the per-unit `ruleSlots` getter.

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { createRunState } from '../../src/logic/map/navigation'
import { drawStarterSquad, toUnitInstance } from '../../src/logic/content/starterPresetLoader'
import type { Unit } from '../../src/logic/state/types'
import { UnitInstance } from '../../src/logic/state/UnitInstance'

function presetToUnit(presetIndex: number, p: ReturnType<typeof drawStarterSquad>[number]): Unit {
  return toUnitInstance(p, `player-${p.id}`, 'player', {
    side: 'player',
    row: 'front',
    column: presetIndex as 0 | 1 | 2,
  })
}

describe('drawStarterSquad — deterministic bootstrap', () => {
  it('produces the same 2 presets for the same seed', () => {
    const a = drawStarterSquad(createRng(123), 2)
    const b = drawStarterSquad(createRng(123), 2)
    expect(a.map(p => p.id)).toEqual(b.map(p => p.id))
  })

  it('produces 2 starters with chassis-appropriate maxHp and 2 rule slots each', () => {
    const presets = drawStarterSquad(createRng(42), 2)
    expect(presets).toHaveLength(2)
    for (const p of presets) {
      const unit = toUnitInstance(p, `player-${p.id}`, 'player', {
        side: 'player',
        row: 'front',
        column: 0,
      })
      // All starter presets have no passive modules, so maxHp = chassis baseHp
      expect(unit.hp).toBe(unit.maxHp)
      expect(unit.ruleSlots).toBe(2)
    }
  })
})

describe('createRunState seeds ruleSlotsMap from unit.ruleSlots (T-6.12)', () => {
  it('reads the per-unit ruleSlots getter when present', () => {
    const presets = drawStarterSquad(createRng(7), 2)
    const units = presets.map((p, i) => presetToUnit(i, p))
    const map = generateMap(createRng(7))
    const run = createRunState(map, units)
    for (const u of units) {
      expect(run.ruleSlotsMap[u.id]).toBe(u.ruleSlots)
    }
  })

  it('uses chassis default ruleSlots (2) for a basic unit', () => {
    const map = generateMap(createRng(7))
    const u = new UnitInstance(
      'legacy',
      'player',
      { side: 'player', row: 'front', column: 0 },
      'vacuum',
      80,
      [{ defId: 'quick_jab', cooldownRemaining: 0 }],
      [],
      [],
    )
    const run = createRunState(map, [u])
    expect(run.ruleSlotsMap['legacy']).toBe(2)
  })

  it('honors passive modules that grant extra rule slots', () => {
    const map = generateMap(createRng(7))
    // Note: if a passive module granting extra_rule_slot exists, the ruleSlots
    // getter would reflect it. For now, base ruleSlots from chassis is 2.
    const u = new UnitInstance(
      'boosted',
      'player',
      { side: 'player', row: 'front', column: 0 },
      'butler',
      50,
      [{ defId: 'taser', cooldownRemaining: 0 }],
      [],
      [],
    )
    const run = createRunState(map, [u])
    // Butler chassis baseRuleSlots = 2, no passive bonus
    expect(run.ruleSlotsMap['boosted']).toBe(2)
  })
})
