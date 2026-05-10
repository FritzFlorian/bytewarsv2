// Module + chassis content validation tests (T-7.6).
//
// Validates:
//   1. All chassis JSON files load and pass Zod validation
//   2. All module JSON files load and pass Zod validation
//   3. Availability constraints are consistent
//   4. Rarity is present on non-enemy-only modules
//   5. Module IDs are unique, chassis IDs are unique

import { describe, it, expect } from 'vitest'
import { getAllChassis, getChassisDef } from '../../src/logic/content/chassisLoader'
import {
  getAllModules,
  getModuleDef,
  getAllActiveModules,
  getAllPassiveModules,
  getModulesForSide,
} from '../../src/logic/content/moduleLoader'

describe('chassis content', () => {
  it('loads all 8 chassis definitions', () => {
    const all = getAllChassis()
    expect(all).toHaveLength(8)
  })

  it('each chassis has a unique id', () => {
    const ids = getAllChassis().map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getChassisDef retrieves by id', () => {
    const vacuum = getChassisDef('vacuum')
    expect(vacuum.name).toBe('Vacuum')
    expect(vacuum.baseHp).toBeGreaterThan(0)
    expect(vacuum.activeSlots).toBeGreaterThanOrEqual(1)
    expect(vacuum.passiveSlots).toBeGreaterThanOrEqual(1)
  })

  it('player chassis have availability "player"', () => {
    const playerIds = ['vacuum', 'butler', 'lawnbot', 'security_drone'] as const
    for (const id of playerIds) {
      expect(getChassisDef(id).availability).toBe('player')
    }
  })

  it('enemy chassis have availability "enemy"', () => {
    const enemyIds = ['qa-rig', 'overseer', 'swarmer', 'siege'] as const
    for (const id of enemyIds) {
      expect(getChassisDef(id).availability).toBe('enemy')
    }
  })
})

describe('module content', () => {
  it('loads all 31 module definitions', () => {
    const all = getAllModules()
    expect(all).toHaveLength(31)
  })

  it('each module has a unique id', () => {
    const ids = getAllModules().map(m => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has 25 active modules (17 attack + 3 heal + 3 buff + 2 debuff)', () => {
    const active = getAllActiveModules()
    expect(active).toHaveLength(25)
    const attacks = active.filter(m => m.actionKind === 'attack')
    const heals = active.filter(m => m.actionKind === 'heal')
    const buffs = active.filter(m => m.actionKind === 'buff')
    const debuffs = active.filter(m => m.actionKind === 'debuff')
    expect(attacks).toHaveLength(17)
    expect(heals).toHaveLength(3)
    expect(buffs).toHaveLength(3)
    expect(debuffs).toHaveLength(2)
  })

  it('has 6 passive modules', () => {
    expect(getAllPassiveModules()).toHaveLength(6)
  })

  it('getModuleDef retrieves by id', () => {
    const qj = getModuleDef('quick_jab')
    expect(qj.name).toBe('Quick Jab')
    expect(qj.type).toBe('active')
  })

  it('non-enemy modules have rarity', () => {
    const all = getAllModules()
    for (const m of all) {
      if (m.availability !== 'enemy') {
        expect(
          m.rarity,
          `Module ${m.id} (availability: ${m.availability}) should have rarity`,
        ).toBeDefined()
      }
    }
  })

  it('enemy-only modules may omit rarity', () => {
    const bite = getModuleDef('bite')
    expect(bite.availability).toBe('enemy')
    // rarity is optional for enemy-only modules
  })

  it('getModulesForSide("player") returns player + both modules', () => {
    const playerModules = getModulesForSide('player')
    for (const m of playerModules) {
      expect(['player', 'both']).toContain(m.availability)
    }
    // Should NOT include enemy-only modules
    expect(playerModules.find(m => m.id === 'bite')).toBeUndefined()
    expect(playerModules.find(m => m.id === 'siege_cannon')).toBeUndefined()
  })

  it('getModulesForSide("enemy") returns enemy + both modules', () => {
    const enemyModules = getModulesForSide('enemy')
    for (const m of enemyModules) {
      expect(['enemy', 'both']).toContain(m.availability)
    }
    // Should NOT include player-only modules
    expect(enemyModules.find(m => m.id === 'patch_kit')).toBeUndefined()
    expect(enemyModules.find(m => m.id === 'emergency_repair')).toBeUndefined()
  })
})

describe('availability validation', () => {
  it('all active attack modules from attacks.json have matching module definitions', () => {
    // Verify the 12 attack modules correspond to the 12 entries in attacks.json
    const attackIds = [
      'quick_jab',
      'sweep',
      'taser',
      'overload',
      'clamp',
      'suppression',
      'mow',
      'bash',
      'dart',
      'pulse_shot',
      'bite',
      'siege_cannon',
    ]
    for (const id of attackIds) {
      const mod = getModuleDef(id)
      expect(mod.type).toBe('active')
      if (mod.type === 'active') {
        expect(mod.actionKind).toBe('attack')
      }
    }
  })

  it('passive effect kinds cover the v0.7 set', () => {
    const passives = getAllPassiveModules()
    const effectKinds = new Set(passives.flatMap(p => p.effects.map(e => e.kind)))
    expect(effectKinds).toContain('bonus_hp')
    expect(effectKinds).toContain('bonus_damage')
    expect(effectKinds).toContain('extra_active_slot')
    expect(effectKinds).toContain('extra_rule_slot')
  })
})
