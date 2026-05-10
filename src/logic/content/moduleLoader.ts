// Module-definition loader for Bytewars v0.7.
//
// Loads and validates all src/content/modules/*.json at startup using
// Vite's import.meta.glob. Throws a descriptive error if any JSON is malformed.

import {
  ModuleDefSchema,
  ActiveModuleDefSchema,
  PassiveModuleDefSchema,
} from '../../content/schema/module'
import type { ModuleDef, ActiveModuleDef, PassiveModuleDef } from '../../content/schema/module'

const moduleFiles = import.meta.glob('../../content/modules/*.json', { eager: true })

let _cache: ModuleDef[] | null = null

function load(): ModuleDef[] {
  if (_cache) return _cache

  const defs: ModuleDef[] = []
  for (const [path, raw] of Object.entries(moduleFiles)) {
    const json = (raw as { default?: unknown }).default ?? raw
    const parsed = ModuleDefSchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
      throw new Error(`Invalid module JSON (${path}):\n${msg}`)
    }
    defs.push(parsed.data)
  }

  if (defs.length === 0) {
    throw new Error('No module definitions found in src/content/modules/')
  }

  _cache = defs
  return _cache
}

export function getAllModules(): ModuleDef[] {
  return load()
}

export function getModuleDef(id: string): ModuleDef {
  const def = load().find(m => m.id === id)
  if (!def) throw new Error(`Unknown module id: ${id}`)
  return def
}

export function getAllActiveModules(): ActiveModuleDef[] {
  return load().filter((m): m is ActiveModuleDef => m.type === 'active')
}

export function getAllPassiveModules(): PassiveModuleDef[] {
  return load().filter((m): m is PassiveModuleDef => m.type === 'passive')
}

export function getActiveModuleDef(id: string): ActiveModuleDef {
  const def = getModuleDef(id)
  if (def.type !== 'active') throw new Error(`Module ${id} is not an active module`)
  const parsed = ActiveModuleDefSchema.safeParse(def)
  if (!parsed.success) throw new Error(`Module ${id} failed active schema validation`)
  return parsed.data
}

export function getPassiveModuleDef(id: string): PassiveModuleDef {
  const def = getModuleDef(id)
  if (def.type !== 'passive') throw new Error(`Module ${id} is not a passive module`)
  const parsed = PassiveModuleDefSchema.safeParse(def)
  if (!parsed.success) throw new Error(`Module ${id} failed passive schema validation`)
  return parsed.data
}

/**
 * Get all modules available to a specific side (for reward pools, fixture validation).
 * "both" modules are available to either side.
 */
export function getModulesForSide(side: 'player' | 'enemy'): ModuleDef[] {
  return load().filter(m => m.availability === side || m.availability === 'both')
}
