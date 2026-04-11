// Zod schema for src/content/player-squad.json.
// Any structural mismatch throws a descriptive error at startup.

import { z } from 'zod'

const TargetSelectorSchema = z.enum(['self', 'nearest_enemy', 'any_enemy'])

const ConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always') }),
  z.object({ kind: z.literal('self_hp_below'), pct: z.number().min(0).max(100) }),
  z.object({ kind: z.literal('target_exists'), target: TargetSelectorSchema }),
])

const ActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('attack'), target: TargetSelectorSchema }),
  z.object({ kind: z.literal('idle') }),
])

const RuleSchema = z.object({
  condition: ConditionSchema,
  action: ActionSchema,
})

const ChassisSchema = z.enum(['vacuum', 'butler', 'qa-rig', 'overseer'])

const RowSchema = z.enum(['front', 'middle', 'back'])
const ColumnSchema = z.union([z.literal(0), z.literal(1), z.literal(2)])

const PlayerUnitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chassis: ChassisSchema,
  row: RowSchema,
  column: ColumnSchema,
  maxHp: z.number().int().positive(),
  gambits: z.array(RuleSchema).min(1),
})

export const PlayerSquadSchema = z.object({
  units: z.array(PlayerUnitSchema).min(1).max(9),
})

export type PlayerSquadData = z.infer<typeof PlayerSquadSchema>
