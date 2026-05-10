// Starter-preset loader for Bytewars v0.7.
//
// Loads and validates src/content/starter-presets.json at startup. Exposes
// drawStarterSquad(), the seeded random-without-replacement draw used by
// both the new-run bootstrap and the "new unit" reward draw.
//
// v0.7: presets now reference module IDs instead of carrying hp/ruleSlots.
// toUnitInstance() converts a preset into a live UnitInstance.

import type { Rng } from '../rng'
import { StarterPresetsSchema, type StarterPreset } from '../../content/schema/starterPreset'
import { UnitInstance } from '../state/UnitInstance'
import type { Side, SlotRef } from '../state/types'
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

/**
 * Create a UnitInstance from a starter preset. HP is set to chassis maxHp
 * (computed from chassis base + passive modules on the preset).
 */
export function toUnitInstance(
  preset: StarterPreset,
  id: string,
  side: Side,
  slot: SlotRef,
): UnitInstance {
  const activeModules = preset.activeModules.map(defId => ({
    defId,
    cooldownRemaining: 0,
  }))
  const passiveModules = preset.passiveModules.map(defId => ({ defId }))

  const unit = new UnitInstance(
    id,
    side,
    slot,
    preset.chassis,
    0, // placeholder — set to maxHp below
    activeModules,
    passiveModules,
    preset.gambits,
  )
  // Set hp to computed maxHp (chassis base + passive bonus_hp effects)
  unit.hp = unit.maxHp

  return unit
}
