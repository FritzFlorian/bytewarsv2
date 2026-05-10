// Reward offer pool + draw (T-7.12, reworked from T-6.9).
//
// drawRewardOffers(rng, context) returns 3 rewards. Per Q-R1, the pool is NOT
// filtered for usefulness — a full-HP squad can still be offered a heal; a
// full grid can still be offered a new unit; a module drop can target a unit
// with no free slots (shown as "no space" and unselectable on the UI).
//
// v0.7 category weights:
//   combat → ~45% module_drop, ~15% new_unit, ~15% heal_one, ~15% heal_all, ~10% remove_module
//   elite  → tilted toward module_drop and new_unit; heals reduced
//
// Module drops are weighted by rarity: weight = 1 / rarity ^ exponent.
// Exponent varies by node type (combat ~1.5, elite ~1.0).

import type { Rng } from '../rng'
import { getAllRecruitmentPresets } from '../content/recruitmentPoolLoader'
import { getModulesForSide } from '../content/moduleLoader'
import type { Reward, RewardContext, RewardKind } from './types'

// ── Category weights ──────────────────────────────────────────────────────

export const COMBAT_WEIGHTS: Record<RewardKind, number> = {
  module_drop: 9,
  new_unit: 3,
  heal_one: 3,
  heal_all: 3,
  remove_module: 2,
}

export const ELITE_WEIGHTS: Record<RewardKind, number> = {
  module_drop: 12,
  new_unit: 4,
  heal_one: 1,
  heal_all: 1,
  remove_module: 2,
}

// ── Rarity exponents per context ──────────────────────────────────────────

const RARITY_EXPONENT: Record<RewardContext, number> = {
  combat: 1.5,
  elite: 1.0,
}

const OFFER_COUNT = 3

// ── Weighted random helpers ───────────────────────────────────────────────

function pickWeightedKind(rng: Rng, weights: Record<RewardKind, number>): RewardKind {
  const entries = Object.entries(weights) as [RewardKind, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  const r = rng.next() * total
  let acc = 0
  for (const [kind, w] of entries) {
    acc += w
    if (r < acc) return kind
  }
  return entries[entries.length - 1][0]
}

/**
 * Draw a random module available to the player, weighted by rarity.
 * Returns the module id.
 */
function drawModuleDrop(rng: Rng, context: RewardContext): string {
  const modules = getModulesForSide('player').filter(m => m.rarity !== undefined)
  const exponent = RARITY_EXPONENT[context]

  const weights = modules.map(m => 1 / Math.pow(m.rarity!, exponent))
  const total = weights.reduce((s, w) => s + w, 0)
  const r = rng.next() * total
  let acc = 0
  for (let i = 0; i < modules.length; i++) {
    acc += weights[i]
    if (r < acc) return modules[i].id
  }
  return modules[modules.length - 1].id
}

// ── Draw a single reward ──────────────────────────────────────────────────

function drawSingle(rng: Rng, weights: Record<RewardKind, number>, context: RewardContext): Reward {
  const kind = pickWeightedKind(rng, weights)

  switch (kind) {
    case 'module_drop':
      return { kind: 'module_drop', moduleId: drawModuleDrop(rng, context) }
    case 'new_unit': {
      const pool = getAllRecruitmentPresets()
      const idx = rng.nextInt(pool.length)
      return { kind: 'new_unit', presetId: pool[idx].id }
    }
    case 'remove_module':
      return { kind: 'remove_module' }
    default:
      return { kind }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export function drawRewardOffers(rng: Rng, context: RewardContext): Reward[] {
  const weights = context === 'elite' ? ELITE_WEIGHTS : COMBAT_WEIGHTS
  const offers: Reward[] = []
  for (let i = 0; i < OFFER_COUNT; i++) {
    offers.push(drawSingle(rng, weights, context))
  }
  return offers
}
