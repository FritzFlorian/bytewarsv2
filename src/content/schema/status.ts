// Status-effect kinds and Zod schema (v0.8).
//
// A status effect is a typed, time-bounded modifier on a single UnitInstance.
// See doc/gameplay.md §6 "Status effects" for the locked v0.8 design.

import { z } from 'zod'

export const StatusKindSchema = z.enum(['burning', 'disabled', 'damage_boost'])

export type StatusKind = z.infer<typeof StatusKindSchema>

/** Static descriptor used in module definitions (`appliesStatus`, buff/debuff props). */
export const StatusEffectSpecSchema = z.object({
  kind: StatusKindSchema,
  magnitude: z.number().int().min(0),
  duration: z.number().int().positive(),
})
export type StatusEffectSpec = z.infer<typeof StatusEffectSpecSchema>
