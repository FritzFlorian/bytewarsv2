// Tests for the reward pool + apply logic (T-7.12, reworked from T-6.9).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { createRunState } from '../../src/logic/map/navigation'
import {
  applyReward,
  HEAL_ALL_PCT,
  setPendingRewardOffers,
  clearPendingRewardOffers,
} from '../../src/logic/rewards/apply'
import { drawRewardOffers, COMBAT_WEIGHTS, ELITE_WEIGHTS } from '../../src/logic/rewards/pool'
import type { RunState } from '../../src/logic/map/types'
import type { Reward, RewardKind } from '../../src/logic/rewards/types'
import { getAllStarterPresets, toUnitInstance } from '../../src/logic/content/starterPresetLoader'
import { getModulesForSide } from '../../src/logic/content/moduleLoader'
import { UnitInstance } from '../../src/logic/state/UnitInstance'

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  const base = createRunState(map, [u1, u2])
  return {
    ...base,
    hpSnapshot: { u1: 50, u2: 20 },
    ...overrides,
  }
}

function distribution(samples: Reward[]): Record<RewardKind, number> {
  const out: Record<RewardKind, number> = {
    heal_one: 0,
    heal_all: 0,
    module_drop: 0,
    remove_module: 0,
    new_unit: 0,
  }
  for (const r of samples) out[r.kind]++
  return out
}

// ── Pool draw ───────────────────────────────────────────────────────────────

describe('drawRewardOffers', () => {
  it('always returns 3 offers', () => {
    expect(drawRewardOffers(createRng(1), 'combat')).toHaveLength(3)
    expect(drawRewardOffers(createRng(1), 'elite')).toHaveLength(3)
  })

  it('is deterministic for a given seed', () => {
    const a = drawRewardOffers(createRng(123), 'combat')
    const b = drawRewardOffers(createRng(123), 'combat')
    expect(a).toEqual(b)
  })

  it('module_drop offers carry a moduleId from the player-available pool', () => {
    const validIds = new Set(getModulesForSide('player').map(m => m.id))
    let seenModuleDrop = false
    for (let seed = 0; seed < 200; seed++) {
      for (const offer of drawRewardOffers(createRng(seed), 'combat')) {
        if (offer.kind === 'module_drop') {
          expect(validIds.has(offer.moduleId)).toBe(true)
          seenModuleDrop = true
        }
      }
    }
    expect(seenModuleDrop).toBe(true)
  })

  it('new_unit offers carry a presetId from the recruitment pool', () => {
    const validIds = new Set(getAllStarterPresets().map(p => p.id))
    let seenNewUnit = false
    for (let seed = 0; seed < 200; seed++) {
      for (const offer of drawRewardOffers(createRng(seed), 'combat')) {
        if (offer.kind === 'new_unit') {
          expect(validIds.has(offer.presetId)).toBe(true)
          seenNewUnit = true
        }
      }
    }
    expect(seenNewUnit).toBe(true)
  })

  it('elite weighting shifts toward module_drop and new_unit, away from heals', () => {
    const N = 4000
    const combat: Reward[] = []
    const elite: Reward[] = []
    for (let i = 0; i < N; i++) {
      combat.push(...drawRewardOffers(createRng(i), 'combat'))
      elite.push(...drawRewardOffers(createRng(i + 100000), 'elite'))
    }
    const c = distribution(combat)
    const e = distribution(elite)
    // module_drop and new_unit appear MORE often under elite weights.
    expect(e.module_drop).toBeGreaterThan(c.module_drop)
    expect(e.new_unit).toBeGreaterThan(c.new_unit)
    // Heals appear LESS often under elite weights.
    expect(e.heal_one).toBeLessThan(c.heal_one)
    expect(e.heal_all).toBeLessThan(c.heal_all)
  })

  it('weight tables include every reward kind exactly once', () => {
    const kinds: RewardKind[] = ['heal_one', 'heal_all', 'module_drop', 'remove_module', 'new_unit']
    for (const k of kinds) {
      expect(COMBAT_WEIGHTS[k]).toBeGreaterThan(0)
      expect(ELITE_WEIGHTS[k]).toBeGreaterThan(0)
    }
  })

  it('module_drop rarity weighting favours common modules', () => {
    // Over many draws, rarity-1 modules should appear much more often than rarity-4.
    const modules = getModulesForSide('player').filter(m => m.rarity !== undefined)
    const counts = new Map<number, number>()
    for (const m of modules) counts.set(m.rarity!, 0)

    for (let seed = 0; seed < 2000; seed++) {
      for (const offer of drawRewardOffers(createRng(seed), 'combat')) {
        if (offer.kind === 'module_drop') {
          const def = modules.find(m => m.id === offer.moduleId)
          if (def) counts.set(def.rarity!, (counts.get(def.rarity!) ?? 0) + 1)
        }
      }
    }
    // Rarity 1 should appear more than rarity 4.
    expect(counts.get(1)!).toBeGreaterThan(counts.get(4)!)
  })
})

// ── Apply ───────────────────────────────────────────────────────────────────

describe('applyReward', () => {
  it('throws on reward/selection kind mismatch', () => {
    const run = makeRun()
    expect(() =>
      applyReward(run, { kind: 'heal_all' }, { kind: 'heal_one', targetUnitId: 'u1' }),
    ).toThrow()
  })

  describe('heal_one', () => {
    it('restores the target unit to maxHp', () => {
      const run = makeRun()
      const next = applyReward(run, { kind: 'heal_one' }, { kind: 'heal_one', targetUnitId: 'u2' })
      expect(next.hpSnapshot.u2).toBe(70)
      expect(next.hpSnapshot.u1).toBe(50)
    })

    it('also pulls a sitting-out unit back in', () => {
      const run = makeRun({ sittingOut: new Set(['u2']), hpSnapshot: { u1: 50, u2: 0 } })
      const next = applyReward(run, { kind: 'heal_one' }, { kind: 'heal_one', targetUnitId: 'u2' })
      expect(next.hpSnapshot.u2).toBe(70)
      expect(next.sittingOut.has('u2')).toBe(false)
    })

    it('is a no-op when the target id is unknown', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'heal_one' },
        { kind: 'heal_one', targetUnitId: 'ghost' },
      )
      expect(next).toBe(run)
    })
  })

  describe('heal_all', () => {
    it('heals every living unit by HEAL_ALL_PCT of maxHp, capped at maxHp', () => {
      const run = makeRun()
      const next = applyReward(run, { kind: 'heal_all' }, { kind: 'heal_all' })
      expect(next.hpSnapshot.u1).toBe(Math.min(70, 50 + Math.ceil(70 * HEAL_ALL_PCT)))
      expect(next.hpSnapshot.u2).toBe(20 + Math.ceil(70 * HEAL_ALL_PCT))
    })

    it('skips dead units and sitting-out units', () => {
      const run = makeRun({
        sittingOut: new Set(['u2']),
        hpSnapshot: { u1: 50, u2: 0 },
      })
      const next = applyReward(run, { kind: 'heal_all' }, { kind: 'heal_all' })
      expect(next.hpSnapshot.u2).toBe(0)
    })
  })

  describe('module_drop', () => {
    it('active module drop does not change RunState snapshots', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'module_drop', moduleId: 'sweep' },
        { kind: 'module_drop', targetUnitId: 'u1' },
      )
      // Active modules don't affect RunState — only the unit object (handled by App.tsx).
      expect(next.maxHpMap).toEqual(run.maxHpMap)
      expect(next.ruleSlotsMap).toEqual(run.ruleSlotsMap)
    })

    it('passive bonus_hp module updates maxHpMap and hpSnapshot', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'module_drop', moduleId: 'reinforced_plating' },
        { kind: 'module_drop', targetUnitId: 'u1' },
      )
      // reinforced_plating gives +15 bonus_hp.
      expect(next.maxHpMap.u1).toBe(run.maxHpMap.u1 + 15)
      expect(next.hpSnapshot.u1).toBe(run.hpSnapshot.u1 + 15)
    })

    it('passive extra_rule_slot module updates ruleSlotsMap', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'module_drop', moduleId: 'logic_co_processor' },
        { kind: 'module_drop', targetUnitId: 'u1' },
      )
      // logic_co_processor gives +1 extra_rule_slot.
      expect(next.ruleSlotsMap.u1).toBe(run.ruleSlotsMap.u1 + 1)
    })
  })

  describe('remove_module', () => {
    it('passive bonus_hp module removal reduces maxHpMap and caps hpSnapshot', () => {
      // Start with a unit that has reinforced_plating installed (via manual RunState setup).
      const run = makeRun({
        maxHpMap: { u1: 85, u2: 70 }, // u1 has +15 from reinforced_plating
        hpSnapshot: { u1: 80, u2: 20 },
      })
      const next = applyReward(
        run,
        { kind: 'remove_module' },
        {
          kind: 'remove_module',
          targetUnitId: 'u1',
          moduleIndex: 0,
          moduleType: 'passive',
          moduleDefId: 'reinforced_plating',
        },
      )
      expect(next.maxHpMap.u1).toBe(70) // 85 - 15
      expect(next.hpSnapshot.u1).toBe(70) // capped at new max (was 80)
    })

    it('active module removal does not change RunState snapshots', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'remove_module' },
        {
          kind: 'remove_module',
          targetUnitId: 'u1',
          moduleIndex: 0,
          moduleType: 'active',
          moduleDefId: 'quick_jab',
        },
      )
      expect(next.maxHpMap).toEqual(run.maxHpMap)
      expect(next.ruleSlotsMap).toEqual(run.ruleSlotsMap)
    })
  })

  describe('new_unit', () => {
    it('seeds hp/maxHp/ruleSlots from the named preset via toUnitInstance', () => {
      const presetId = getAllStarterPresets()[0].id
      const preset = getAllStarterPresets()[0]
      const run = makeRun()
      const slot = { side: 'player' as const, row: 'front' as const, column: 2 as const }
      const expectedUnit = toUnitInstance(preset, 'u3', 'player', slot)
      const next = applyReward(
        run,
        { kind: 'new_unit', presetId },
        { kind: 'new_unit', newUnitId: 'u3', slot },
      )
      expect(next.hpSnapshot.u3).toBe(expectedUnit.maxHp)
      expect(next.maxHpMap.u3).toBe(expectedUnit.maxHp)
      expect(next.ruleSlotsMap.u3).toBe(expectedUnit.ruleSlots)
    })

    it('throws if the presetId is unknown', () => {
      const run = makeRun()
      expect(() =>
        applyReward(
          run,
          { kind: 'new_unit', presetId: 'nope' },
          {
            kind: 'new_unit',
            newUnitId: 'u3',
            slot: { side: 'player', row: 'front', column: 2 },
          },
        ),
      ).toThrow()
    })
  })
})

// ── Pending offers stash ────────────────────────────────────────────────────

describe('pendingRewardOffers stash helpers', () => {
  it('set then clear round-trips', () => {
    const run = makeRun()
    const offers: Reward[] = [{ kind: 'heal_all' }]
    const stashed = setPendingRewardOffers(run, offers)
    expect(stashed.pendingRewardOffers).toBe(offers)
    const cleared = clearPendingRewardOffers(stashed)
    expect(cleared.pendingRewardOffers).toBeUndefined()
  })

  it('clearPendingRewardOffers is a no-op when nothing pending', () => {
    const run = makeRun()
    expect(clearPendingRewardOffers(run)).toBe(run)
  })
})
