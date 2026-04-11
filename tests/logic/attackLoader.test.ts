import { describe, it, expect } from 'vitest'
import { getAllAttacks, getAttackDef, getAttacksForChassis } from '../../src/logic/content/attackLoader'

describe('attackLoader', () => {
  it('every chassis in the roster has at least one attack', () => {
    const chassisList = ['vacuum', 'butler', 'qa-rig', 'overseer'] as const
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

  it('getAllAttacks returns all 6 attacks', () => {
    expect(getAllAttacks()).toHaveLength(6)
  })

  it('getAttackDef throws for unknown id', () => {
    // @ts-expect-error testing invalid input
    expect(() => getAttackDef('nonexistent')).toThrow()
  })
})
