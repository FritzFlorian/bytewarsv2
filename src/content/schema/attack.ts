// Zod schema for src/content/attacks.json.
// Any structural mismatch throws a descriptive error at startup.

import { z } from 'zod'
import type { Chassis } from '../../logic/state/types'

export const AttackIdSchema = z.enum([
  'quick_jab',
  'sweep',
  'taser',
  'overload',
  'clamp',
  'suppression',
])

export type AttackId = z.infer<typeof AttackIdSchema>

const AttackDefSchema = z.object({
  id: AttackIdSchema,
  name: z.string().min(1),
  damage: z.number().int().positive(),
  cooldown: z.number().int().min(0),
  initialCooldown: z.number().int().min(0),
  sound: AttackIdSchema,
  chassis: z.array(z.string().min(1)).min(1),
})

export type AttackDef = z.infer<typeof AttackDefSchema> & { chassis: Chassis[] }

export const AttacksSchema = z.array(AttackDefSchema).min(1)
