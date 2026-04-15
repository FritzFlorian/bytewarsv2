// Reward application (T-6.9).
//
// applyReward(state, reward, selection) returns a new RunState with the
// reward's effect baked in. Pure logic — no UI, no DOM.
//
// Per-kind semantics:
//   - heal_one  → restore the target unit to maxHp; if dead/sitting-out,
//                 also pull them back in (sittingOut.delete). Q-R5 wording
//                 ("living + returning-at-42% units") covers both states.
//   - heal_all  → +50% of maxHp (HEAL_ALL_PCT) to every living unit, capped
//                 at maxHp. Dead / sitting-out units are skipped, matching
//                 Repair Bay semantics in Q-G6.
//   - rule_slot → +1 to the target's rule-slot count, capped at RULE_SLOT_CAP.
//                 Applying to a capped unit is a no-op (Q-R4 — the offer was
//                 still drawn, but it's wasted on this player).
//   - new_unit  → instantiate the preset's HP/maxHp/ruleSlots into RunState
//                 keyed by the new unit's id. The actual Unit object lives in
//                 the App-level squad list (T-6.13 wires that up).

import type { RunState } from '../map/types'
import type { Reward, RewardSelection } from './types'
import { getStarterPreset } from '../content/starterPresetLoader'

/** Q-R4: maximum rule-slot count per unit. */
export const RULE_SLOT_CAP = 6

/** Q-G6 / Q-R5: percent of maxHp restored by heal_all and Repair Bay. */
export const HEAL_ALL_PCT = 0.5

export function applyReward(state: RunState, reward: Reward, selection: RewardSelection): RunState {
  if (reward.kind !== selection.kind) {
    throw new Error(
      `applyReward: reward.kind=${reward.kind} does not match selection.kind=${selection.kind}`,
    )
  }

  switch (reward.kind) {
    case 'heal_one': {
      const sel = selection as Extract<RewardSelection, { kind: 'heal_one' }>
      const max = state.maxHpMap[sel.targetUnitId]
      if (max === undefined) return state
      const newSittingOut = new Set(state.sittingOut)
      newSittingOut.delete(sel.targetUnitId)
      return {
        ...state,
        hpSnapshot: { ...state.hpSnapshot, [sel.targetUnitId]: max },
        sittingOut: newSittingOut,
      }
    }
    case 'heal_all': {
      const newHp: Record<string, number> = { ...state.hpSnapshot }
      for (const id of Object.keys(newHp)) {
        if (state.sittingOut.has(id)) continue
        if ((newHp[id] ?? 0) <= 0) continue
        const max = state.maxHpMap[id] ?? newHp[id]
        const heal = Math.ceil(max * HEAL_ALL_PCT)
        newHp[id] = Math.min(max, newHp[id] + heal)
      }
      return { ...state, hpSnapshot: newHp }
    }
    case 'rule_slot': {
      const sel = selection as Extract<RewardSelection, { kind: 'rule_slot' }>
      const cur = state.ruleSlotsMap[sel.targetUnitId]
      if (cur === undefined) return state
      if (cur >= RULE_SLOT_CAP) return state
      return {
        ...state,
        ruleSlotsMap: { ...state.ruleSlotsMap, [sel.targetUnitId]: cur + 1 },
      }
    }
    case 'new_unit': {
      const sel = selection as Extract<RewardSelection, { kind: 'new_unit' }>
      const preset = getStarterPreset(reward.presetId)
      return {
        ...state,
        hpSnapshot: { ...state.hpSnapshot, [sel.newUnitId]: preset.hp },
        maxHpMap: { ...state.maxHpMap, [sel.newUnitId]: preset.hp },
        ruleSlotsMap: { ...state.ruleSlotsMap, [sel.newUnitId]: preset.ruleSlots },
      }
    }
  }
}

/** Stash a fresh batch of offers on RunState (UI uses this to know to show the screen). */
export function setPendingRewardOffers(state: RunState, offers: Reward[]): RunState {
  return { ...state, pendingRewardOffers: offers }
}

/** Clear after the player picks one. */
export function clearPendingRewardOffers(state: RunState): RunState {
  if (state.pendingRewardOffers === undefined) return state
  const next = { ...state }
  delete next.pendingRewardOffers
  return next
}
