import { describe, it, expect } from 'vitest'
import { getAllStarterPresets, drawStarterSquad } from '../../src/logic/content/starterPresetLoader'
import { createRng } from '../../src/logic/rng'
import { getAttacksForChassis } from '../../src/logic/content/attackLoader'
import { isAttackAction } from '../../src/logic/gambits/types'

describe('T-6.3: starter preset pool', () => {
  it('schema validates every preset (loader would throw otherwise)', () => {
    const presets = getAllStarterPresets()
    expect(presets.length).toBeGreaterThanOrEqual(6)
  })

  it('covers Vacuum, Butler, Lawnbot, Security-drone', () => {
    const chassisSet = new Set(getAllStarterPresets().map(p => p.chassis))
    expect(chassisSet.has('vacuum')).toBe(true)
    expect(chassisSet.has('butler')).toBe(true)
    expect(chassisSet.has('lawnbot')).toBe(true)
    expect(chassisSet.has('security_drone')).toBe(true)
  })

  it('every preset ships at baseline 70 HP / 2 rule slots (post-T-6.16 balance)', () => {
    for (const p of getAllStarterPresets()) {
      expect(p.hp).toBe(70)
      expect(p.ruleSlots).toBe(2)
    }
  })

  it("every preset's gambits reference only attacks valid for its chassis", () => {
    for (const p of getAllStarterPresets()) {
      const validIds = new Set(getAttacksForChassis(p.chassis).map(a => a.id))
      for (const rule of p.gambits) {
        if (isAttackAction(rule.action)) {
          expect(validIds.has(rule.action.kind)).toBe(true)
        }
      }
    }
  })

  it('drawStarterSquad returns N distinct presets', () => {
    const rng = createRng(42)
    const drawn = drawStarterSquad(rng, 2)
    expect(drawn).toHaveLength(2)
    expect(drawn[0].id).not.toBe(drawn[1].id)
  })

  it('drawStarterSquad is deterministic for a given seed', () => {
    const a = drawStarterSquad(createRng(123), 2).map(p => p.id)
    const b = drawStarterSquad(createRng(123), 2).map(p => p.id)
    expect(a).toEqual(b)
  })

  it('drawStarterSquad throws if requested count exceeds pool size', () => {
    const rng = createRng(1)
    const pool = getAllStarterPresets().length
    expect(() => drawStarterSquad(rng, pool + 1)).toThrow()
  })
})
