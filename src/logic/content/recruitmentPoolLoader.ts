// Recruitment-pool loader for Bytewars v0.7.
//
// Loads and validates src/content/recruitment-presets.json at startup.
// Same format as starter presets. For v0.7, content is identical to the
// starter pool — the files are separate so pools can diverge later.
//
// Used for mid-run "new unit" reward draws (replaces the starter pool
// for that purpose).

import type { Rng } from '../rng'
import { StarterPresetsSchema, type StarterPreset } from '../../content/schema/starterPreset'
import recruitmentJson from '../../content/recruitment-presets.json'

let _cache: StarterPreset[] | null = null

function load(): StarterPreset[] {
  if (_cache) return _cache

  const parsed = StarterPresetsSchema.safeParse(recruitmentJson)
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid recruitment-presets.json:\n${msg}`)
  }

  _cache = parsed.data
  return _cache
}

export function getAllRecruitmentPresets(): StarterPreset[] {
  return load()
}

export function getRecruitmentPreset(id: string): StarterPreset {
  const p = load().find(p => p.id === id)
  if (!p) throw new Error(`Unknown recruitment preset id: ${id}`)
  return p
}

/**
 * Draw `count` distinct presets from the recruitment pool using the run RNG.
 * Random without replacement — throws if the pool has fewer than `count` entries.
 */
export function drawRecruitmentPresets(rng: Rng, count: number): StarterPreset[] {
  const pool = [...load()]
  if (count > pool.length) {
    throw new Error(`drawRecruitmentPresets: requested ${count} but pool has ${pool.length}`)
  }
  const picked: StarterPreset[] = []
  for (let i = 0; i < count; i++) {
    const idx = rng.nextInt(pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}
