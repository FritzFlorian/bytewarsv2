import { describe, it, expect } from 'vitest'
import type { Chassis } from '../../src/logic/state/types'
import {
  ChassisSchema,
  StarterPresetSchema,
} from '../../src/content/schema/starterPreset'

// All 8 chassis ids recognised in v0.6. Writing the literal array with
// `satisfies` ensures the list stays in sync with the `Chassis` type: any
// member missing from the union (or any extra member not in it) is a compile
// error, so this test guards the type itself, not just the runtime data.
const ALL_CHASSIS = [
  'vacuum',
  'butler',
  'qa-rig',
  'overseer',
  'lawnbot',
  'security_drone',
  'swarmer',
  'siege',
] as const satisfies readonly Chassis[]

describe('T-6.1: Chassis registration', () => {
  it('every chassis id round-trips through ChassisSchema', () => {
    for (const c of ALL_CHASSIS) {
      expect(ChassisSchema.parse(c)).toBe(c)
    }
  })

  it('ChassisSchema rejects unknown ids', () => {
    expect(ChassisSchema.safeParse('not-a-chassis').success).toBe(false)
  })

  it('every chassis id round-trips through StarterPresetSchema', () => {
    for (const c of ALL_CHASSIS) {
      const preset = {
        id: `test-${c}`,
        name: 'Test',
        chassis: c,
        hp: 50,
        ruleSlots: 2,
        gambits: [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
      }
      const parsed = StarterPresetSchema.parse(preset)
      expect(parsed.chassis).toBe(c)
    }
  })
})
