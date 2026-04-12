// Zod schema for src/content/starter-presets.json — the pool of deliberately
// weak unit presets a new run draws its starting squad from, and also the
// pool the "new unit" reward pulls from (per open-questions.md Q-R3).
//
// Replaces the v0.4 player-squad.json + PlayerSquadSchema in v0.6 (roadmap T-6.3).

import { z } from 'zod'
import { AttackIdSchema } from './attack'

const TargetSelectorSchema = z.enum(['self', 'nearest_enemy', 'any_enemy'])

const ConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }),
  z.object({ kind: z.literal('self_hp_below'), pct: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('target_exists'), target: TargetSelectorSchema }),
])

const ActionSchema = z.union([
  z.object({ kind: AttackIdSchema, target: TargetSelectorSchema }),
  z.object({ kind: z.literal('idle') }),
])

const RuleSchema = z.object({
  condition: ConditionSchema,
  action: ActionSchema,
})

export const ChassisSchema = z.enum([
  'vacuum',
  'butler',
  'qa-rig',
  'overseer',
  'lawnbot',
  'security_drone',
  'swarmer',
  'siege',
])

export const StarterPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chassis: ChassisSchema,
  hp: z.number().int().positive(),
  ruleSlots: z.number().int().min(1).max(6),
  gambits: z.array(RuleSchema).min(1),
})

export const StarterPresetsSchema = z.array(StarterPresetSchema).min(1)

export type StarterPreset = z.infer<typeof StarterPresetSchema>
export type StarterPresetId = StarterPreset['id']
