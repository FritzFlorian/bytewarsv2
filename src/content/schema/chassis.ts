// Zod schema for chassis definition files (src/content/chassis/<id>.json).
// Each chassis is a vessel: base stats + silhouette, no inherent attacks.
// Availability constrains which side can use a chassis.

import { z } from 'zod'

export const AvailabilitySchema = z.enum(['player', 'enemy', 'both'])
export type Availability = z.infer<typeof AvailabilitySchema>

export const ChassisIdSchema = z.enum([
  'vacuum',
  'butler',
  'lawnbot',
  'security_drone',
  'qa-rig',
  'overseer',
  'swarmer',
  'siege',
])

export type ChassisId = z.infer<typeof ChassisIdSchema>

export const ChassisDefSchema = z.object({
  id: ChassisIdSchema,
  name: z.string().min(1),
  availability: AvailabilitySchema,
  baseHp: z.number().int().positive(),
  baseRuleSlots: z.number().int().min(1).max(6),
  activeSlots: z.number().int().min(1).max(4),
  passiveSlots: z.number().int().min(1).max(6),
})

export type ChassisDef = z.infer<typeof ChassisDefSchema>
