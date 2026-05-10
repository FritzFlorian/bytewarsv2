// Full-run simulator (T-6.16, updated T-7.12).
//
// Plays a complete Bytewars run end-to-end at the logic layer with no UI:
//   - Draws starter squad (draft flow: 3+3 options, auto-pick first of each)
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
  toUnitInstance,
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
  getRecruitmentPreset,
  getModuleDef,
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

  // Mirror App.tsx draft flow: draw 3+3 options, auto-pick first of each.
  const options1 = drawStarterSquad(rng, 3)
  const options2 = drawStarterSquad(rng, 3)
  const presets = [options1[0], options2[0]]

  const units: Unit[] = presets.map((p, i) =>
    toUnitInstance(p, `player-${p.id}`, 'player', {
      side: 'player',
      row: 'front',
      column: STARTER_COLUMNS[i],
    }),
  )
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
  const survivingHp: Record<string, number> = {}
  for (const u of playerUnits) survivingHp[u.id] = hps[u.id] ?? 0
  return { events, result: { winner, survivingHp } }
}

/** Pick first reachable node — deterministic for a given map. */
function pickNextNode(run: RunState): MapNode {
  const reachable = run.graph.edges
    .filter(e => e.from === (run.currentNodeId ?? ''))
    .map(eid => run.graph.nodes.find(n => n.id === eid.to)!)
    .filter(Boolean)

  if (run.currentNodeId === null) {
    const minCol = Math.min(...run.graph.nodes.map(n => n.column))
    const opts = run.graph.nodes.filter(n => n.column === minCol)
    return opts.find(n => n.type === 'combat') ?? opts[0]
  }

  return (
    reachable.find(n => n.type === 'repair_bay') ??
    reachable.find(n => n.type === 'elite') ??
    reachable.find(n => n.type === 'combat') ??
    reachable.find(n => n.type === 'boss') ??
    reachable[0]
  )
}

/** Build a default RewardSelection that is always valid for the offered reward. */
function autoSelectReward(
  reward: Reward,
  run: RunState,
  units: Unit[],
): {
  selection: RewardSelection
  newUnit?: Unit
  installModule?: { unitIndex: number; moduleId: string }
  removeModule?: { unitIndex: number; moduleIndex: number; moduleType: 'active' | 'passive' }
} {
  switch (reward.kind) {
    case 'heal_all':
      return { selection: { kind: 'heal_all' } }
    case 'heal_one': {
      const living = units.filter(u => (run.hpSnapshot[u.id] ?? 0) > 0)
      const target = living.length
        ? living.reduce((a, b) =>
            (run.hpSnapshot[a.id] ?? 0) / a.maxHp <= (run.hpSnapshot[b.id] ?? 0) / b.maxHp ? a : b,
          )
        : units[0]
      return { selection: { kind: 'heal_one', targetUnitId: target.id } }
    }
    case 'module_drop': {
      const moduleDef = getModuleDef(reward.moduleId)
      const eligible = units.filter(u =>
        moduleDef.type === 'active' ? u.canInstallActive() : u.canInstallPassive(),
      )
      if (eligible.length === 0) {
        // No unit can take this module — pick first unit anyway (reward is
        // effectively wasted, but we need a valid selection for the logic).
        // In the real UI this card would be unselectable.
        return { selection: { kind: 'module_drop', targetUnitId: units[0].id } }
      }
      const target = eligible[0]
      return {
        selection: { kind: 'module_drop', targetUnitId: target.id },
        installModule: { unitIndex: units.indexOf(target), moduleId: reward.moduleId },
      }
    }
    case 'remove_module': {
      // Find a unit with a removable module (passive or non-last active).
      const eligible = units.filter(u => u.activeModules.length > 1 || u.passiveModules.length > 0)
      if (eligible.length === 0) {
        // No removable modules — effectively wasted.
        return {
          selection: {
            kind: 'remove_module',
            targetUnitId: units[0].id,
            moduleIndex: 0,
            moduleType: 'active',
            moduleDefId: units[0].activeModules[0].defId,
          },
        }
      }
      const target = eligible[0]
      // Prefer removing a passive module; else remove a non-last active.
      if (target.passiveModules.length > 0) {
        return {
          selection: {
            kind: 'remove_module',
            targetUnitId: target.id,
            moduleIndex: 0,
            moduleType: 'passive',
            moduleDefId: target.passiveModules[0].defId,
          },
          removeModule: { unitIndex: units.indexOf(target), moduleIndex: 0, moduleType: 'passive' },
        }
      }
      // Remove the second active module (first is kept as the >=1 guarantee).
      return {
        selection: {
          kind: 'remove_module',
          targetUnitId: target.id,
          moduleIndex: 1,
          moduleType: 'active',
          moduleDefId: target.activeModules[1].defId,
        },
        removeModule: { unitIndex: units.indexOf(target), moduleIndex: 1, moduleType: 'active' },
      }
    }
    case 'new_unit': {
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
        chosen = { row: 'front', column: 0 }
      }
      const preset = getRecruitmentPreset(reward.presetId)
      const newUnitId = `player-${preset.id}-${chosen.row}-${chosen.column}`
      const newUnit = toUnitInstance(preset, newUnitId, 'player', {
        side: 'player',
        row: chosen.row,
        column: chosen.column,
      })
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
  path: { nodeId: string; type: 'combat' | 'elite' | 'boss' | 'repair_bay' }[]
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
      units = units.map(u => {
        const clone = u.clone()
        clone.hp = run.hpSnapshot[u.id] ?? u.hp
        return clone
      })
      continue
    }

    let enemyUnits
    if (next.type === 'boss') enemyUnits = bossEncounterFixture().enemyUnits
    else if (next.type === 'elite') {
      const eliteSeed = seed ^ hashString(next.id)
      enemyUnits = drawEliteEncounter(createRng(eliteSeed)).enemyUnits
    } else enemyUnits = walkingSkeletonFixture().enemyUnits

    const fighting = units
      .filter(u => !run.sittingOut.has(u.id))
      .map(u => {
        const clone = u.clone()
        clone.hp = run.hpSnapshot[u.id] ?? u.hp
        return clone
      })

    const { result } = resolveCombat(seed, fighting, enemyUnits)
    run = applyBattleResult(run, result)
    units = units.map(u => {
      const clone = u.clone()
      clone.hp = run.hpSnapshot[u.id] ?? u.hp
      return clone
    })

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
      // Auto-pick: prefer heal_all > heal_one > module_drop > new_unit > remove_module.
      const ranked = [...offers].sort((a, b) => priorityOf(a, units) - priorityOf(b, units))
      const reward = ranked[0]
      const { selection, newUnit, installModule, removeModule } = autoSelectReward(
        reward,
        run,
        units,
      )
      run = applyReward(run, reward, selection)
      run = clearPendingRewardOffers(run)

      // Apply module changes to units.
      if (installModule) {
        const target = units[installModule.unitIndex]
        const clone = target.clone()
        const moduleDef = getModuleDef(installModule.moduleId)
        if (moduleDef.type === 'active') {
          clone.installActive(installModule.moduleId)
        } else {
          clone.installPassive(installModule.moduleId)
        }
        units = units.map((u, i) => (i === installModule.unitIndex ? clone : u))
      }

      if (removeModule) {
        const target = units[removeModule.unitIndex]
        const clone = target.clone()
        if (removeModule.moduleType === 'active') {
          clone.removeActive(removeModule.moduleIndex)
        } else {
          clone.removePassive(removeModule.moduleIndex)
        }
        units = units.map((u, i) => (i === removeModule.unitIndex ? clone : u))
      }

      if (reward.kind === 'new_unit' && newUnit) {
        const occupied = new Set(units.map(u => `${u.slot.row}-${u.slot.column}`))
        if (!occupied.has(`${newUnit.slot.row}-${newUnit.slot.column}`)) {
          units = [...units, newUnit]
        }
      }

      units = units.map(u => {
        const clone = u.clone()
        clone.hp = run.hpSnapshot[u.id] ?? u.hp
        return clone
      })
    }
  }

  return {
    status: run.status === 'won' ? 'won' : 'lost',
    path,
    finalHp: run.hpSnapshot,
  }
}

function priorityOf(r: Reward, units: Unit[]): number {
  switch (r.kind) {
    case 'heal_all':
      return 0
    case 'heal_one':
      return 1
    case 'module_drop': {
      // Deprioritize if no unit can actually install this module.
      const moduleDef = getModuleDef(r.moduleId)
      const canInstall = units.some(u =>
        moduleDef.type === 'active' ? u.canInstallActive() : u.canInstallPassive(),
      )
      return canInstall ? 2 : 10
    }
    case 'new_unit':
      return 3
    case 'remove_module': {
      const canRemove = units.some(u => u.activeModules.length > 1 || u.passiveModules.length > 0)
      return canRemove ? 4 : 10
    }
  }
}
