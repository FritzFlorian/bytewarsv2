// Reward application (T-7.12, reworked from T-6.9).
//
// applyReward(state, reward, selection) returns a new RunState with the
// reward's effect baked in. Pure logic — no UI, no DOM.
//
// Per-kind semantics:
//   - heal_one    → restore the target unit to maxHp; if dead/sitting-out,
//                   also pull them back in (sittingOut.delete). Q-R5 wording
//                   ("living + returning-at-42% units") covers both states.
//   - heal_all    → +50% of maxHp (HEAL_ALL_PCT) to every living unit, capped
//                   at maxHp. Dead / sitting-out units are skipped, matching
//                   Repair Bay semantics in Q-G6.
//   - module_drop → update RunState snapshots for passive module effects
//                   (bonus_hp → maxHpMap + hpSnapshot, extra_rule_slot →
//                   ruleSlotsMap). The actual module install on the Unit object
//                   is handled by App.tsx / the simulation caller.
//   - remove_module → reverse passive module effects in RunState snapshots.
//                   The actual module removal on the Unit object is handled
//                   by App.tsx / the simulation caller.
//   - new_unit    → instantiate the preset's HP/maxHp/ruleSlots into RunState
//                   keyed by the new unit's id.

import type { RunState } from '../map/types'
import type { Reward, RewardSelection } from './types'
import { getRecruitmentPreset } from '../content/recruitmentPoolLoader'
import { getModuleDef } from '../content/moduleLoader'
import { toUnitInstance } from '../content/starterPresetLoader'

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
    case 'module_drop': {
      const sel = selection as Extract<RewardSelection, { kind: 'module_drop' }>
      const moduleDef = getModuleDef(reward.moduleId)
      if (moduleDef.type !== 'passive') {
        // Active modules don't affect RunState snapshots.
        return state
      }
      // Apply passive module effects to RunState snapshots.
      let newMaxHpMap = state.maxHpMap
      let newHpSnapshot = state.hpSnapshot
      let newRuleSlotsMap = state.ruleSlotsMap
      for (const eff of moduleDef.effects) {
        if (eff.kind === 'bonus_hp') {
          const oldMax = newMaxHpMap[sel.targetUnitId] ?? 0
          newMaxHpMap = { ...newMaxHpMap, [sel.targetUnitId]: oldMax + eff.value }
          // Increase current HP too so the bonus isn't "empty".
          const oldHp = newHpSnapshot[sel.targetUnitId] ?? 0
          newHpSnapshot = { ...newHpSnapshot, [sel.targetUnitId]: oldHp + eff.value }
        }
        if (eff.kind === 'extra_rule_slot') {
          const oldSlots = newRuleSlotsMap[sel.targetUnitId] ?? 0
          newRuleSlotsMap = { ...newRuleSlotsMap, [sel.targetUnitId]: oldSlots + eff.value }
        }
      }
      return {
        ...state,
        maxHpMap: newMaxHpMap,
        hpSnapshot: newHpSnapshot,
        ruleSlotsMap: newRuleSlotsMap,
      }
    }
    case 'remove_module': {
      const sel = selection as Extract<RewardSelection, { kind: 'remove_module' }>
      const moduleDef = getModuleDef(sel.moduleDefId)
      if (moduleDef.type !== 'passive') {
        // Active modules don't affect RunState snapshots.
        return state
      }
      // Reverse passive module effects in RunState snapshots.
      let newMaxHpMap = state.maxHpMap
      let newHpSnapshot = state.hpSnapshot
      let newRuleSlotsMap = state.ruleSlotsMap
      for (const eff of moduleDef.effects) {
        if (eff.kind === 'bonus_hp') {
          const oldMax = newMaxHpMap[sel.targetUnitId] ?? 0
          const newMax = Math.max(1, oldMax - eff.value)
          newMaxHpMap = { ...newMaxHpMap, [sel.targetUnitId]: newMax }
          // Cap current HP at new max.
          const oldHp = newHpSnapshot[sel.targetUnitId] ?? 0
          newHpSnapshot = { ...newHpSnapshot, [sel.targetUnitId]: Math.min(oldHp, newMax) }
        }
        if (eff.kind === 'extra_rule_slot') {
          const oldSlots = newRuleSlotsMap[sel.targetUnitId] ?? 0
          newRuleSlotsMap = {
            ...newRuleSlotsMap,
            [sel.targetUnitId]: Math.max(1, oldSlots - eff.value),
          }
        }
      }
      return {
        ...state,
        maxHpMap: newMaxHpMap,
        hpSnapshot: newHpSnapshot,
        ruleSlotsMap: newRuleSlotsMap,
      }
    }
    case 'new_unit': {
      const sel = selection as Extract<RewardSelection, { kind: 'new_unit' }>
      const preset = getRecruitmentPreset(reward.presetId)
      const tempUnit = toUnitInstance(preset, sel.newUnitId, 'player', sel.slot)
      return {
        ...state,
        hpSnapshot: { ...state.hpSnapshot, [sel.newUnitId]: tempUnit.maxHp },
        maxHpMap: { ...state.maxHpMap, [sel.newUnitId]: tempUnit.maxHp },
        ruleSlotsMap: { ...state.ruleSlotsMap, [sel.newUnitId]: tempUnit.ruleSlots },
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
