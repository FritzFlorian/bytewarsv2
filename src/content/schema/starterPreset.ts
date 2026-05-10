// Zod schema for src/content/starter-presets.json — the pool of deliberately
// weak unit presets a new run draws its starting squad from, and also the
// pool the "new unit" reward pulls from.
//
// v0.7: hp and ruleSlots removed (derived from chassis definition). Added
// activeModules and passiveModules (arrays of module IDs).

import { z } from 'zod'
import { ChassisIdSchema } from './chassis'
import { StatusKindSchema } from './status'

const TargetSelectorSchema = z.enum([
  'self',
  'nearest_enemy',
  'any_enemy',
  'any_ally',
  'weakest_ally',
  'all_enemies',
  'all_enemies_in_row',
  'all_allies',
])

const ConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }),
  z.object({ kind: z.literal('self_hp_below'), pct: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('target_exists'), target: TargetSelectorSchema }),
  z.object({ kind: z.literal('self_has_status'), statusKind: StatusKindSchema }),
  z.object({
    kind: z.literal('target_has_status'),
    target: TargetSelectorSchema,
    statusKind: StatusKindSchema,
  }),
])

// Action kind is now a module ID string (not restricted to AttackIdSchema)
const ActionSchema = z.union([
  z.object({ kind: z.string().min(1), target: TargetSelectorSchema }),
  z.object({ kind: z.literal('idle') }),
])

const RuleSchema = z.object({
  condition: ConditionSchema,
  action: ActionSchema,
})

export const StarterPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chassis: ChassisIdSchema,
  activeModules: z.array(z.string().min(1)).min(1),
  passiveModules: z.array(z.string().min(1)),
  gambits: z.array(RuleSchema).min(1),
})

export const StarterPresetsSchema = z.array(StarterPresetSchema).min(1)

export type StarterPreset = z.infer<typeof StarterPresetSchema>
export type StarterPresetId = StarterPreset['id']
