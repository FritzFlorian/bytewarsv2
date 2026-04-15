// Attack-definition loader for Bytewars v0.5.
//
// Loads and validates src/content/attacks.json at startup.
// Throws a descriptive error if the JSON is malformed.

import type { Chassis } from '../state/types'
import { AttacksSchema } from '../../content/schema/attack'
import type { AttackDef, AttackId } from '../../content/schema/attack'
import attacksJson from '../../content/attacks.json'

let _cache: AttackDef[] | null = null

function loadAttacks(): AttackDef[] {
  if (_cache) return _cache

  const parsed = AttacksSchema.safeParse(attacksJson)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid attacks.json:\n${msg}`)
  }

  _cache = parsed.data as AttackDef[]
  return _cache
}

export function getAllAttacks(): AttackDef[] {
  return loadAttacks()
}

export function getAttackDef(id: AttackId): AttackDef {
  const def = loadAttacks().find(a => a.id === id)
  if (!def) throw new Error(`Unknown attack id: ${id}`)
  return def
}

export function getAttacksForChassis(chassis: Chassis): AttackDef[] {
  return loadAttacks().filter(a => (a.chassis as string[]).includes(chassis))
}
