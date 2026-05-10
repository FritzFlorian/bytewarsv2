// Schema tests for the v0.8 module schema additions (T-8.3).
//
// Verifies the new active actionKind variants (`buff`, `debuff`), the optional
// `appliesStatus` field on attacks, and the additive shape of the discriminated
// union. Invalid combinations are rejected by Zod.

import { describe, it, expect } from 'vitest'
import { ActiveModuleDefSchema } from '../../src/content/schema/module'

describe('module schema v2 — actionKind: attack with appliesStatus', () => {
  it('accepts an attack with appliesStatus', () => {
    const json = {
      id: 'flamethrower',
      name: 'Flamethrower',
      type: 'active',
      availability: 'player',
      rarity: 2,
      actionKind: 'attack',
      attackProperties: {
        damage: 6,
        cooldown: 1,
        initialCooldown: 0,
        appliesStatus: { kind: 'burning', magnitude: 3, duration: 2 },
      },
      sound: 'attack',
    }
    const r = ActiveModuleDefSchema.safeParse(json)
    expect(r.success).toBe(true)
  })

  it('appliesStatus is optional — plain attacks still parse', () => {
    const json = {
      id: 'quick_jab',
      name: 'Quick Jab',
      type: 'active',
      availability: 'both',
      rarity: 1,
      actionKind: 'attack',
      attackProperties: { damage: 8, cooldown: 0, initialCooldown: 0 },
      sound: 'quick_jab',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(true)
  })

  it('rejects an unknown statusKind in appliesStatus', () => {
    const json = {
      id: 'bad',
      name: 'Bad',
      type: 'active',
      availability: 'player',
      rarity: 2,
      actionKind: 'attack',
      attackProperties: {
        damage: 6,
        cooldown: 1,
        initialCooldown: 0,
        appliesStatus: { kind: 'frozen', magnitude: 3, duration: 2 },
      },
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(false)
  })
})

describe('module schema v2 — actionKind: buff', () => {
  it('accepts a buff module', () => {
    const json = {
      id: 'damage_drive',
      name: 'Damage Drive',
      type: 'active',
      availability: 'player',
      rarity: 2,
      actionKind: 'buff',
      buffProperties: {
        status: { kind: 'damage_boost', magnitude: 4, duration: 2 },
        cooldown: 2,
        initialCooldown: 0,
      },
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(true)
  })

  it('rejects a buff missing buffProperties', () => {
    const json = {
      id: 'damage_drive',
      name: 'Damage Drive',
      type: 'active',
      availability: 'player',
      rarity: 2,
      actionKind: 'buff',
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(false)
  })
})

describe('module schema v2 — actionKind: debuff', () => {
  it('accepts a debuff module', () => {
    const json = {
      id: 'corrosion',
      name: 'Corrosion',
      type: 'active',
      availability: 'player',
      rarity: 3,
      actionKind: 'debuff',
      debuffProperties: {
        status: { kind: 'burning', magnitude: 3, duration: 3 },
        cooldown: 2,
        initialCooldown: 0,
      },
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(true)
  })

  it('rejects a debuff with negative magnitude', () => {
    const json = {
      id: 'corrosion',
      name: 'Corrosion',
      type: 'active',
      availability: 'player',
      rarity: 3,
      actionKind: 'debuff',
      debuffProperties: {
        status: { kind: 'burning', magnitude: -1, duration: 3 },
        cooldown: 2,
        initialCooldown: 0,
      },
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(false)
  })

  it('rejects a debuff with zero duration', () => {
    const json = {
      id: 'corrosion',
      name: 'Corrosion',
      type: 'active',
      availability: 'player',
      rarity: 3,
      actionKind: 'debuff',
      debuffProperties: {
        status: { kind: 'burning', magnitude: 3, duration: 0 },
        cooldown: 2,
        initialCooldown: 0,
      },
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(false)
  })
})

describe('module schema v2 — discriminator', () => {
  it('rejects unknown actionKind', () => {
    const json = {
      id: 'x',
      name: 'X',
      type: 'active',
      availability: 'player',
      rarity: 1,
      actionKind: 'dot',
      sound: 'attack',
    }
    expect(ActiveModuleDefSchema.safeParse(json).success).toBe(false)
  })
})
