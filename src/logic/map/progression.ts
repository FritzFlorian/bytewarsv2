// Battle-result application for Bytewars v0.4.
//
// applyBattleResult takes the run state plus the outcome of a single fight
// and produces the new run state with:
//   1. Surviving unit HP carried over.
//   2. Newly dead units moved into the sitting-out set.
//   3. Units that sat out this fight (were already in sittingOut) revived at 42% HP.
//   4. Run status updated (lost if enemy wins; won if boss was beaten).

import type { RunState, BattleResult } from './types'
import { HEAL_ALL_PCT } from '../rewards/apply'

/**
 * Apply the Repair Bay heal effect (T-6.11): every living unit (HP > 0 and
 * not in sittingOut) regains HEAL_ALL_PCT of its maxHp, capped at maxHp.
 *
 * Mirrors the reward-system "heal_all" semantics intentionally — Q-G6 ties the
 * Repair Bay to the same partial-heal-all subtype.
 */
export function applyRepairBay(run: RunState): RunState {
  const newHp: Record<string, number> = { ...run.hpSnapshot }
  for (const id of Object.keys(newHp)) {
    if (run.sittingOut.has(id)) continue
    if ((newHp[id] ?? 0) <= 0) continue
    const max = run.maxHpMap[id] ?? newHp[id]
    const heal = Math.ceil(max * HEAL_ALL_PCT)
    newHp[id] = Math.min(max, newHp[id] + heal)
  }
  return { ...run, hpSnapshot: newHp }
}

export function applyBattleResult(run: RunState, result: BattleResult): RunState {
  const newHpSnapshot = { ...run.hpSnapshot }

  // 1. Update HP for every unit that fought (= not in sittingOut).
  for (const [unitId, hp] of Object.entries(result.survivingHp)) {
    if (!run.sittingOut.has(unitId)) {
      newHpSnapshot[unitId] = hp
    }
  }

  // 2. Identify newly dead: fought this fight and now at 0 HP.
  const newSittingOut = new Set<string>()
  for (const unitId of Object.keys(run.hpSnapshot)) {
    if (!run.sittingOut.has(unitId)) {
      // This unit fought this fight.
      const hp = result.survivingHp[unitId] ?? 0
      if (hp <= 0) {
        newHpSnapshot[unitId] = 0
        newSittingOut.add(unitId)
      }
    }
  }

  // 3. Revive units that were sitting out (they sat out this fight → return at 42%).
  for (const unitId of run.sittingOut) {
    const maxHp = run.maxHpMap[unitId] ?? 0
    newHpSnapshot[unitId] = Math.ceil(maxHp * 0.42)
    // newSittingOut intentionally does NOT include them (they return to active).
  }

  // 4. Determine new run status.
  let newStatus: RunState['status'] = run.status
  if (result.winner === 'enemy') {
    newStatus = 'lost'
  } else if (run.currentNodeId !== null) {
    const currentNode = run.graph.nodes.find(n => n.id === run.currentNodeId)
    if (currentNode?.type === 'boss') {
      newStatus = 'won'
    }
  }

  return {
    ...run,
    hpSnapshot: newHpSnapshot,
    sittingOut: newSittingOut,
    status: newStatus,
  }
}
