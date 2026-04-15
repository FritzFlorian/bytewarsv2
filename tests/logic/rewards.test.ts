// Tests for the reward pool + apply logic (T-6.9).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { createRunState } from '../../src/logic/map/navigation'
import {
  applyReward,
  RULE_SLOT_CAP,
  HEAL_ALL_PCT,
  setPendingRewardOffers,
  clearPendingRewardOffers,
} from '../../src/logic/rewards/apply'
import { drawRewardOffers, COMBAT_WEIGHTS, ELITE_WEIGHTS } from '../../src/logic/rewards/pool'
import type { RunState } from '../../src/logic/map/types'
import type { Reward, RewardKind } from '../../src/logic/rewards/types'
import { getAllStarterPresets } from '../../src/logic/content/starterPresetLoader'

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRun(overrides?: Partial<RunState>): RunState {
  const map = generateMap(createRng(7))
  const base = createRunState(map, [
    {
      id: 'u1',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 0 },
      chassis: 'vacuum',
      hp: 50,
      maxHp: 50,
      gambits: [],
    },
    {
      id: 'u2',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 1 },
      chassis: 'butler',
      hp: 20,
      maxHp: 50,
      gambits: [],
    },
  ])
  // The createRunState helper sets hp from unit.hp; force u2 to its damaged value.
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
    rule_slot: 0,
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

  it('new_unit offers carry a presetId from the starter pool', () => {
    const validIds = new Set(getAllStarterPresets().map(p => p.id))
    // Run many seeds to surface any new_unit draws.
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

  it('elite weighting shifts away from heals toward rule_slot/new_unit', () => {
    const N = 4000
    const combat: Reward[] = []
    const elite: Reward[] = []
    for (let i = 0; i < N; i++) {
      combat.push(...drawRewardOffers(createRng(i), 'combat'))
      elite.push(...drawRewardOffers(createRng(i + 100000), 'elite'))
    }
    const c = distribution(combat)
    const e = distribution(elite)
    // Both rule_slot and new_unit appear MORE often under elite weights.
    expect(e.rule_slot).toBeGreaterThan(c.rule_slot)
    expect(e.new_unit).toBeGreaterThan(c.new_unit)
    // Heals appear LESS often under elite weights.
    expect(e.heal_one).toBeLessThan(c.heal_one)
    expect(e.heal_all).toBeLessThan(c.heal_all)
  })

  it('weight tables include every reward kind exactly once', () => {
    const kinds: RewardKind[] = ['heal_one', 'heal_all', 'rule_slot', 'new_unit']
    for (const k of kinds) {
      expect(COMBAT_WEIGHTS[k]).toBeGreaterThan(0)
      expect(ELITE_WEIGHTS[k]).toBeGreaterThan(0)
    }
  })
})

// ── Apply ───────────────────────────────────────────────────────────────────

describe('applyReward', () => {
  it('throws on reward/selection kind mismatch', () => {
    const run = makeRun()
    expect(() =>
      applyReward(run, { kind: 'heal_all' }, { kind: 'rule_slot', targetUnitId: 'u1' }),
    ).toThrow()
  })

  describe('heal_one', () => {
    it('restores the target unit to maxHp', () => {
      const run = makeRun()
      const next = applyReward(run, { kind: 'heal_one' }, { kind: 'heal_one', targetUnitId: 'u2' })
      expect(next.hpSnapshot.u2).toBe(50)
      expect(next.hpSnapshot.u1).toBe(50)
    })

    it('also pulls a sitting-out unit back in', () => {
      const run = makeRun({ sittingOut: new Set(['u2']), hpSnapshot: { u1: 50, u2: 0 } })
      const next = applyReward(run, { kind: 'heal_one' }, { kind: 'heal_one', targetUnitId: 'u2' })
      expect(next.hpSnapshot.u2).toBe(50)
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
      // u1 was already at 50/50 → stays at 50.
      expect(next.hpSnapshot.u1).toBe(50)
      // u2 was at 20/50 → +25 (ceil(50 * 0.5)) = 45.
      expect(next.hpSnapshot.u2).toBe(20 + Math.ceil(50 * HEAL_ALL_PCT))
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

  describe('rule_slot', () => {
    it('adds 1 slot to the chosen unit', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'rule_slot' },
        { kind: 'rule_slot', targetUnitId: 'u1' },
      )
      expect(next.ruleSlotsMap.u1).toBe(3)
      expect(next.ruleSlotsMap.u2).toBe(2)
    })

    it('caps at RULE_SLOT_CAP — applying to a capped unit is a no-op', () => {
      const run = makeRun({
        ruleSlotsMap: { u1: RULE_SLOT_CAP, u2: 2 },
      })
      const next = applyReward(
        run,
        { kind: 'rule_slot' },
        { kind: 'rule_slot', targetUnitId: 'u1' },
      )
      expect(next.ruleSlotsMap.u1).toBe(RULE_SLOT_CAP)
    })

    it('is a no-op when the target id is unknown', () => {
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'rule_slot' },
        { kind: 'rule_slot', targetUnitId: 'ghost' },
      )
      expect(next).toBe(run)
    })
  })

  describe('new_unit', () => {
    it('seeds hp/maxHp/ruleSlots from the named preset', () => {
      const presetId = getAllStarterPresets()[0].id
      const preset = getAllStarterPresets()[0]
      const run = makeRun()
      const next = applyReward(
        run,
        { kind: 'new_unit', presetId },
        {
          kind: 'new_unit',
          newUnitId: 'u3',
          slot: { side: 'player', row: 'front', column: 2 },
        },
      )
      expect(next.hpSnapshot.u3).toBe(preset.hp)
      expect(next.maxHpMap.u3).toBe(preset.hp)
      expect(next.ruleSlotsMap.u3).toBe(preset.ruleSlots)
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
