// Starter-preset loader for Bytewars v0.6.
//
// Loads and validates src/content/starter-presets.json at startup. Exposes
// drawStarterSquad(), the seeded random-without-replacement draw used by
// both the new-run bootstrap (T-6.12) and the "new unit" reward draw.

import type { Rng } from '../rng'
import { StarterPresetsSchema, type StarterPreset } from '../../content/schema/starterPreset'
import presetsJson from '../../content/starter-presets.json'

let _cache: StarterPreset[] | null = null

function load(): StarterPreset[] {
  if (_cache) return _cache

  const parsed = StarterPresetsSchema.safeParse(presetsJson)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid starter-presets.json:\n${msg}`)
  }

  _cache = parsed.data
  return _cache
}

export function getAllStarterPresets(): StarterPreset[] {
  return load()
}

export function getStarterPreset(id: string): StarterPreset {
  const p = load().find(p => p.id === id)
  if (!p) throw new Error(`Unknown starter preset id: ${id}`)
  return p
}

/**
 * Draw `count` distinct presets from the pool using the run RNG.
 * Random without replacement — throws if the pool has fewer than `count` entries.
 */
export function drawStarterSquad(rng: Rng, count: number): StarterPreset[] {
  const pool = [...load()]
  if (count > pool.length) {
    throw new Error(`drawStarterSquad: requested ${count} but pool has ${pool.length}`)
  }
  const picked: StarterPreset[] = []
  for (let i = 0; i < count; i++) {
    const idx = rng.nextInt(pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}
