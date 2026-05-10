// Chassis-definition loader for Bytewars v0.7.
//
// Loads and validates all src/content/chassis/*.json at startup using
// Vite's import.meta.glob. Throws a descriptive error if any JSON is malformed.

import { ChassisDefSchema } from '../../content/schema/chassis'
import type { ChassisDef, ChassisId } from '../../content/schema/chassis'

const chassisFiles = import.meta.glob('../../content/chassis/*.json', { eager: true })

let _cache: ChassisDef[] | null = null

function load(): ChassisDef[] {
  if (_cache) return _cache

  const defs: ChassisDef[] = []
  for (const [path, raw] of Object.entries(chassisFiles)) {
    const json = (raw as { default?: unknown }).default ?? raw
    const parsed = ChassisDefSchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
      throw new Error(`Invalid chassis JSON (${path}):\n${msg}`)
    }
    defs.push(parsed.data)
  }

  if (defs.length === 0) {
    throw new Error('No chassis definitions found in src/content/chassis/')
  }

  _cache = defs
  return _cache
}

export function getAllChassis(): ChassisDef[] {
  return load()
}

export function getChassisDef(id: ChassisId): ChassisDef {
  const def = load().find(c => c.id === id)
  if (!def) throw new Error(`Unknown chassis id: ${id}`)
  return def
}
