// Reward offer pool + draw (T-6.9).
//
// drawRewardOffers(rng, context) returns 3 rewards. Per Q-R1, the pool is NOT
// filtered for usefulness — a full-HP squad can still be offered a heal; a
// full grid can still be offered a new unit. Bad rolls are part of the run.
//
// Weighting per Q-R6:
//   - combat → uniform across the 4 reward kinds.
//   - elite  → tilted toward `rule_slot` and `new_unit` (heal weights drop).
//
// For `new_unit` offers, the preset id is sub-drawn uniformly from the same
// starter-preset pool the run-bootstrap uses (Q-R3). Same-preset duplicates
// across the 3 offers are allowed — they're just two rolls of the same die.

import type { Rng } from '../rng'
import { getAllStarterPresets } from '../content/starterPresetLoader'
import type { Reward, RewardContext, RewardKind } from './types'

export const COMBAT_WEIGHTS: Record<RewardKind, number> = {
  heal_one: 1,
  heal_all: 1,
  rule_slot: 1,
  new_unit: 1,
}

export const ELITE_WEIGHTS: Record<RewardKind, number> = {
  heal_one: 0.5,
  heal_all: 0.5,
  rule_slot: 2,
  new_unit: 2,
}

const OFFER_COUNT = 3

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

function drawSingle(rng: Rng, weights: Record<RewardKind, number>): Reward {
  const kind = pickWeightedKind(rng, weights)
  if (kind === 'new_unit') {
    const pool = getAllStarterPresets()
    const idx = rng.nextInt(pool.length)
    return { kind: 'new_unit', presetId: pool[idx].id }
  }
  return { kind }
}

export function drawRewardOffers(rng: Rng, context: RewardContext): Reward[] {
  const weights = context === 'elite' ? ELITE_WEIGHTS : COMBAT_WEIGHTS
  const offers: Reward[] = []
  for (let i = 0; i < OFFER_COUNT; i++) {
    offers.push(drawSingle(rng, weights))
  }
  return offers
}
