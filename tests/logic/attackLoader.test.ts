import { describe, it, expect } from 'vitest'
import {
  getAllAttacks,
  getAttackDef,
  getAttacksForChassis,
} from '../../src/logic/content/attackLoader'

describe('attackLoader', () => {
  it('every chassis in the roster has at least one attack', () => {
    const chassisList = [
      'vacuum',
      'butler',
      'qa-rig',
      'overseer',
      'lawnbot',
      'security_drone',
      'swarmer',
      'siege',
    ] as const
    for (const chassis of chassisList) {
      expect(getAttacksForChassis(chassis).length).toBeGreaterThan(0)
    }
  })

  it('getAttacksForChassis returns only valid entries for vacuum', () => {
    const attacks = getAttacksForChassis('vacuum')
    expect(attacks.map(a => a.id)).toEqual(['quick_jab', 'sweep'])
    for (const a of attacks) {
      expect(a.chassis).toContain('vacuum')
    }
  })

  it('getAttacksForChassis returns only valid entries for butler', () => {
    const attacks = getAttacksForChassis('butler')
    expect(attacks.map(a => a.id)).toEqual(['taser', 'overload'])
  })

  it('getAttackDef returns correct values', () => {
    expect(getAttackDef('overload').damage).toBe(30)
    expect(getAttackDef('quick_jab').cooldown).toBe(0)
    expect(getAttackDef('sweep').cooldown).toBe(2)
    expect(getAttackDef('overload').initialCooldown).toBe(1)
  })

  it('getAllAttacks returns all 12 attacks', () => {
    expect(getAllAttacks()).toHaveLength(12)
  })

  it('T-6.2: siege has siege_cannon with devastating damage', () => {
    const siegeAttacks = getAttacksForChassis('siege')
    expect(siegeAttacks.map(a => a.id)).toEqual(['siege_cannon'])
    const def = getAttackDef('siege_cannon')
    expect(def.damage).toBeGreaterThanOrEqual(40)
    expect(def.initialCooldown).toBe(1)
    expect(def.cooldown).toBeGreaterThan(0)
  })

  it('T-6.2: lawnbot and security_drone have 2 attacks each', () => {
    expect(getAttacksForChassis('lawnbot').map(a => a.id)).toEqual(['mow', 'bash'])
    expect(getAttacksForChassis('security_drone').map(a => a.id)).toEqual(['dart', 'pulse_shot'])
  })

  it('T-6.2: swarmer has bite', () => {
    expect(getAttacksForChassis('swarmer').map(a => a.id)).toEqual(['bite'])
  })

  it('getAttackDef throws for unknown id', () => {
    // @ts-expect-error testing invalid input
    expect(() => getAttackDef('nonexistent')).toThrow()
  })
})
