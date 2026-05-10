// Zod schema for module definition files (src/content/modules/<id>.json).
//
// Modules are chassis-agnostic upgrades installed on units. Two types:
//   - Active: provide combat actions (attack or heal in v0.7).
//     Union type on `actionKind` with per-kind nested properties.
//   - Passive: grant always-on effects (bonus_hp, bonus_damage, etc.).
//
// All modules carry an `availability` field constraining which side can use them.
// `rarity` (1-4) is required for player/both modules; omitted for enemy-only.

import { z } from 'zod'
import { AvailabilitySchema } from './chassis'
import { StatusEffectSpecSchema } from './status'

// ── Active module schemas ─────────────────────────────────────────────────

const AttackPropertiesSchema = z.object({
  damage: z.number().int().positive(),
  cooldown: z.number().int().min(0),
  initialCooldown: z.number().int().min(0),
  /** v0.8 — apply a status to each resolved target on hit. */
  appliesStatus: StatusEffectSpecSchema.optional(),
})

const HealPropertiesSchema = z.object({
  healAmount: z.number().int().positive(),
  cooldown: z.number().int().min(0),
  initialCooldown: z.number().int().min(0),
})

const BuffPropertiesSchema = z.object({
  status: StatusEffectSpecSchema,
  cooldown: z.number().int().min(0),
  initialCooldown: z.number().int().min(0),
})

const DebuffPropertiesSchema = z.object({
  status: StatusEffectSpecSchema,
  cooldown: z.number().int().min(0),
  initialCooldown: z.number().int().min(0),
})

const ActiveAttackModuleDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('active'),
  availability: AvailabilitySchema,
  rarity: z.number().int().min(1).max(4).optional(),
  actionKind: z.literal('attack'),
  attackProperties: AttackPropertiesSchema,
  sound: z.string().min(1),
})

const ActiveHealModuleDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('active'),
  availability: AvailabilitySchema,
  rarity: z.number().int().min(1).max(4).optional(),
  actionKind: z.literal('heal'),
  healProperties: HealPropertiesSchema,
  sound: z.string().min(1),
})

const ActiveBuffModuleDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('active'),
  availability: AvailabilitySchema,
  rarity: z.number().int().min(1).max(4).optional(),
  actionKind: z.literal('buff'),
  buffProperties: BuffPropertiesSchema,
  sound: z.string().min(1),
})

const ActiveDebuffModuleDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('active'),
  availability: AvailabilitySchema,
  rarity: z.number().int().min(1).max(4).optional(),
  actionKind: z.literal('debuff'),
  debuffProperties: DebuffPropertiesSchema,
  sound: z.string().min(1),
})

export const ActiveModuleDefSchema = z.discriminatedUnion('actionKind', [
  ActiveAttackModuleDefSchema,
  ActiveHealModuleDefSchema,
  ActiveBuffModuleDefSchema,
  ActiveDebuffModuleDefSchema,
])

export type ActiveModuleDef = z.infer<typeof ActiveModuleDefSchema>

// ── Passive module schema ─────────────────────────────────────────────────

export const PassiveEffectKindSchema = z.enum([
  'bonus_hp',
  'bonus_damage',
  'extra_active_slot',
  'extra_rule_slot',
])
export type PassiveEffectKind = z.infer<typeof PassiveEffectKindSchema>

const PassiveEffectSchema = z.object({
  kind: PassiveEffectKindSchema,
  value: z.number().int().positive(),
})
export type PassiveEffect = z.infer<typeof PassiveEffectSchema>

export const PassiveModuleDefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('passive'),
  availability: AvailabilitySchema,
  rarity: z.number().int().min(1).max(4).optional(),
  effects: z.array(PassiveEffectSchema).min(1),
})

export type PassiveModuleDef = z.infer<typeof PassiveModuleDefSchema>

// ── Combined module schema ────────────────────────────────────────────────

// Can't use discriminatedUnion on 'type' because active modules need a
// nested discriminator on 'actionKind'. Use z.union instead.
export const ModuleDefSchema = z.union([
  ActiveAttackModuleDefSchema,
  ActiveHealModuleDefSchema,
  ActiveBuffModuleDefSchema,
  ActiveDebuffModuleDefSchema,
  PassiveModuleDefSchema,
])

export type ModuleDef = z.infer<typeof ModuleDefSchema>

export type ModuleId = string
export type ActiveModuleId = string
export type PassiveModuleId = string
