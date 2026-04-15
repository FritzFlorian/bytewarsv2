// Full-run simulator (T-6.16).
//
// Plays a complete Bytewars run end-to-end at the logic layer with no UI:
//   - Draws starter squad
//   - Generates map
//   - Walks node-by-node, picking the first reachable target each step
//   - Resolves combat, applies rewards (auto-pick), and keeps going
//
// Used by:
//   - balanceSimulation.test.ts — runs many seeds, prints/asserts win-rate
//   - fullRunSeed.test.ts        — pins a winning seed used by the e2e

import {
  createCombat,
  resolveRound,
  isCombatOver,
  drawStarterSquad,
  generateMap,
  createRunState,
  selectNode,
  applyBattleResult,
  applyRepairBay,
  bossEncounterFixture,
  walkingSkeletonFixture,
  drawEliteEncounter,
  drawRewardOffers,
  applyReward,
  setPendingRewardOffers,
  clearPendingRewardOffers,
  createRng,
  getStarterPreset,
  RULE_SLOT_CAP,
} from '../../src/logic'
import type {
  Unit,
  RunState,
  BattleResult,
  CombatEvent,
  MapNode,
  Reward,
  RewardSelection,
} from '../../src/logic'

const STARTER_COLUMNS = [0, 1, 2] as const

function hashString(s: string): number {
  let h = 5381 >>> 0
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

function bootstrapRun(seed: number): { run: RunState; units: Unit[] } {
  const rng = createRng(seed)
  const presets = drawStarterSquad(rng, 2)
  const units: Unit[] = presets.map((p, i) => ({
    id: `player-${p.id}`,
    side: 'player',
    slot: { side: 'player', row: 'front', column: STARTER_COLUMNS[i] },
    chassis: p.chassis,
    hp: p.hp,
    maxHp: p.hp,
    gambits: p.gambits,
    ruleSlots: p.ruleSlots,
  }))
  const map = generateMap(rng)
  return { run: createRunState(map, units), units }
}

function resolveCombat(
  seed: number,
  playerUnits: Unit[],
  enemyUnits: Unit[],
): { events: CombatEvent[]; result: BattleResult } {
  let state = createCombat(seed, playerUnits, enemyUnits)
  const events: CombatEvent[] = []
  let guard = 0
  while (!isCombatOver(state)) {
    if (++guard > 200) throw new Error('combat ran past 200 rounds')
    const r = resolveRound(state)
    events.push(...r.events)
    state = r.state
  }

  const startHp: Record<string, number> = {}
  for (const u of playerUnits) startHp[u.id] = u.hp
  for (const u of enemyUnits) startHp[u.id] = u.hp
  const hps = { ...startHp }
  let winner: 'player' | 'enemy' = 'enemy'
  for (const e of events) {
    if (e.kind === 'damage_dealt') {
      hps[e.targetId] = Math.max(0, (hps[e.targetId] ?? 0) - e.amount)
    } else if (e.kind === 'combat_ended') {
      winner = e.winner
    }
  }
  // BattleResult only carries player-unit survivingHp for progression purposes.
  const survivingHp: Record<string, number> = {}
  for (const u of playerUnits) survivingHp[u.id] = hps[u.id] ?? 0
  return { events, result: { winner, survivingHp } }
}

/** Pick first reachable node — deterministic for a given map. */
function pickNextNode(run: RunState): MapNode {
  // Slight bias: prefer elite + repair_bay nodes when reachable so the
  // simulator exercises every node type. Falls back to first reachable.
  const reachable = run.graph.edges
    .filter(e => e.from === (run.currentNodeId ?? ''))
    .map(eid => run.graph.nodes.find(n => n.id === eid.to)!)
    .filter(Boolean)

  // Special-case the very first move (no edges from null).
  if (run.currentNodeId === null) {
    const minCol = Math.min(...run.graph.nodes.map(n => n.column))
    const opts = run.graph.nodes.filter(n => n.column === minCol)
    return opts.find(n => n.type === 'combat') ?? opts[0]
  }

  // Auto-pilot heuristic: prefer repair_bay (free heal), then combat (safer
  // than elite), then elite, then boss only when no other option.
  return (
    reachable.find(n => n.type === 'repair_bay') ??
    reachable.find(n => n.type === 'combat') ??
    reachable.find(n => n.type === 'elite') ??
    reachable.find(n => n.type === 'boss') ??
    reachable[0]
  )
}

/** Build a default RewardSelection that is always valid for the offered reward. */
function autoSelectReward(
  reward: Reward,
  run: RunState,
  units: Unit[],
): { selection: RewardSelection; newUnit?: Unit } {
  switch (reward.kind) {
    case 'heal_all':
      return { selection: { kind: 'heal_all' } }
    case 'heal_one': {
      // Pick the lowest-HP living unit (or any if none qualify).
      const living = units.filter(u => (run.hpSnapshot[u.id] ?? 0) > 0)
      const target = living.length
        ? living.reduce((a, b) =>
            (run.hpSnapshot[a.id] ?? 0) / a.maxHp <= (run.hpSnapshot[b.id] ?? 0) / b.maxHp ? a : b,
          )
        : units[0]
      return { selection: { kind: 'heal_one', targetUnitId: target.id } }
    }
    case 'rule_slot': {
      const target = units.find(u => (run.ruleSlotsMap[u.id] ?? 0) < RULE_SLOT_CAP) ?? units[0]
      return { selection: { kind: 'rule_slot', targetUnitId: target.id } }
    }
    case 'new_unit': {
      // Find first empty slot in the 3×3 player grid.
      const occupied = new Set(units.map(u => `${u.slot.row}-${u.slot.column}`))
      const rows: ('front' | 'middle' | 'back')[] = ['front', 'middle', 'back']
      let chosen: { row: 'front' | 'middle' | 'back'; column: 0 | 1 | 2 } | null = null
      outer: for (const row of rows) {
        for (const column of [0, 1, 2] as const) {
          if (!occupied.has(`${row}-${column}`)) {
            chosen = { row, column }
            break outer
          }
        }
      }
      if (!chosen) {
        // Grid full — selection is still required, pick the first slot. The
        // reward will overwrite hp/ruleSlots in maps; the new Unit object is
        // discarded by the caller (but we still need a valid selection).
        chosen = { row: 'front', column: 0 }
      }
      const preset = getStarterPreset(reward.presetId)
      const newUnitId = `player-${preset.id}-${chosen.row}-${chosen.column}`
      const newUnit: Unit = {
        id: newUnitId,
        side: 'player',
        slot: { side: 'player', row: chosen.row, column: chosen.column },
        chassis: preset.chassis,
        hp: preset.hp,
        maxHp: preset.hp,
        gambits: preset.gambits,
        ruleSlots: preset.ruleSlots,
      }
      return {
        selection: {
          kind: 'new_unit',
          newUnitId,
          slot: { side: 'player', row: chosen.row, column: chosen.column },
        },
        newUnit,
      }
    }
  }
}

export interface RunOutcome {
  status: 'won' | 'lost'
  /** Visited node types in order, ending with the final node. */
  path: { nodeId: string; type: 'combat' | 'elite' | 'boss' | 'repair_bay' }[]
  /** Final HP map after the run ends. */
  finalHp: Record<string, number>
}

/** Play a full run. Returns 'won' if the boss is defeated, 'lost' otherwise. */
export function simulateFullRun(seed: number): RunOutcome {
  const { run: initialRun, units: initialUnits } = bootstrapRun(seed)
  let run = initialRun
  let units = initialUnits
  const path: RunOutcome['path'] = []

  let guard = 0
  while (run.status === 'active') {
    if (++guard > 30) throw new Error(`run exceeded 30 nodes (seed=${seed})`)

    const next = pickNextNode(run)
    run = selectNode(run, next.id)
    path.push({ nodeId: next.id, type: next.type })

    if (next.type === 'repair_bay') {
      run = applyRepairBay(run)
      // Sync unit hp from snapshot.
      units = units.map(u => ({ ...u, hp: run.hpSnapshot[u.id] ?? u.hp }))
      continue
    }

    // Combat / elite / boss: pick fixture, fight, apply result.
    let enemyUnits
    if (next.type === 'boss') enemyUnits = bossEncounterFixture().enemyUnits
    else if (next.type === 'elite') {
      const eliteSeed = seed ^ hashString(next.id)
      enemyUnits = drawEliteEncounter(createRng(eliteSeed)).enemyUnits
    } else enemyUnits = walkingSkeletonFixture().enemyUnits

    const fighting = units
      .filter(u => !run.sittingOut.has(u.id))
      .map(u => ({ ...u, hp: run.hpSnapshot[u.id] ?? u.hp }))

    const { result } = resolveCombat(seed, fighting, enemyUnits)
    run = applyBattleResult(run, result)
    units = units.map(u => ({ ...u, hp: run.hpSnapshot[u.id] ?? u.hp }))

    // After non-boss wins, apply a reward.
    if (
      run.status === 'active' &&
      result.winner === 'player' &&
      (next.type === 'combat' || next.type === 'elite')
    ) {
      const rewardSeed = seed ^ hashString(`reward:${next.id}`)
      const offers = drawRewardOffers(
        createRng(rewardSeed),
        next.type === 'elite' ? 'elite' : 'combat',
      )
      run = setPendingRewardOffers(run, offers)
      // Auto-pick: prefer heal_all > heal_one > new_unit > rule_slot.
      const ranked = [...offers].sort((a, b) => priorityOf(a) - priorityOf(b))
      const reward = ranked[0]
      const { selection, newUnit } = autoSelectReward(reward, run, units)
      run = applyReward(run, reward, selection)
      run = clearPendingRewardOffers(run)
      if (reward.kind === 'new_unit' && newUnit) {
        const occupied = new Set(units.map(u => `${u.slot.row}-${u.slot.column}`))
        if (!occupied.has(`${newUnit.slot.row}-${newUnit.slot.column}`)) {
          units = [...units, newUnit]
        }
      }
      units = units.map(u => ({ ...u, hp: run.hpSnapshot[u.id] ?? u.hp }))
    }
  }

  return {
    status: run.status === 'won' ? 'won' : 'lost',
    path,
    finalHp: run.hpSnapshot,
  }
}

function priorityOf(r: Reward): number {
  switch (r.kind) {
    case 'heal_all':
      return 0
    case 'heal_one':
      return 1
    case 'new_unit':
      return 2
    case 'rule_slot':
      return 3
  }
}
