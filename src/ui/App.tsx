// App.tsx — v0.4 run-scoped state machine.
//
// Phases:
//   map          → player views the branching map, selects a node
//   gambit-editor → player programs unit AI before a fight
//   combat       → pre-resolved fight plays back
//   game-over    → squad was wiped
//   victory      → boss defeated
//
// Audio: initAudio() is called inside the first user-gesture handler so the
// browser allows AudioContext creation without a suspended-context warning.

import { useState, useCallback, useRef } from 'react'
import {
  createCombat,
  resolveRound,
  isCombatOver,
  drawStarterSquad,
  generateMap,
  createRunState,
  selectNode,
  applyBattleResult,
  bossEncounterFixture,
  walkingSkeletonFixture,
  drawEliteEncounter,
  applyRepairBay,
  drawRewardOffers,
  applyReward,
  setPendingRewardOffers,
  clearPendingRewardOffers,
  createRng,
} from '../logic'
import type {
  CombatEvent,
  GambitList,
  Unit,
  RunState,
  BattleResult,
  Reward,
  RewardSelection,
} from '../logic'
import { GambitEditorScreen } from './screens/GambitEditor/GambitEditorScreen'
import type { UnitEditorEntry } from './screens/GambitEditor/GambitEditorScreen'
import { CombatScreen } from './screens/Combat/CombatScreen'
import type { CombatScreenProps } from './screens/Combat/CombatScreen'
import { MapScreen } from './screens/RunMap/MapScreen'
import { GameOverScreen } from './screens/GameOver/GameOverScreen'
import { VictoryScreen } from './screens/Victory/VictoryScreen'
import { RewardScreen } from './screens/Reward/RewardScreen'
import { DebugUnits } from './screens/Combat/_DebugUnits'
import { ChassisPreview } from './screens/ChassisPreview/ChassisPreview'
import { DebugScene } from '../render/CombatScene'
import { DebugAudio } from '../audio/_DebugAudio'
import { initAudio } from '../audio/engine'
import type { UnitInfo } from '../render/CombatScene'
import type { PlaybackSpeed } from '../render/playback'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppPhase = 'map' | 'gambit-editor' | 'combat' | 'reward' | 'game-over' | 'victory'

interface RunContext {
  playerUnits: Unit[]
  runState: RunState
  phase: AppPhase
  combatProps: CombatScreenProps | null
  /** Seed used for this run (for display / replay). */
  seed: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Grid columns (0, 1, 2) used in order when placing drawn starter presets. */
const STARTER_COLUMNS = [0, 1, 2] as const

/**
 * djb2-ish string hash → 32-bit unsigned int. Used to derive a deterministic
 * per-node seed for elite-fixture draws (so the same map seed + same node id
 * always rolls the same elite fixture).
 */
function hashString(s: string): number {
  let h = 5381 >>> 0
  for (let i = 0; i < s.length; i++) {
    h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

/**
 * Read an optional `?seed=N` URL parameter to force a deterministic run.
 * Useful for reproducing bug reports and for e2e tests that must see a
 * specific fight outcome. Returns null if not present or malformed.
 */
function readSeedOverride(): number | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('seed')
  if (raw === null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : null
}

/** Build a fresh run by drawing 2 starter presets and seating them front-row. */
function startRun(): RunContext {
  const seed = readSeedOverride() ?? Date.now()
  const rng = createRng(seed)
  const presets = drawStarterSquad(rng, 2)
  const playerUnits: Unit[] = presets.map((p, i) => ({
    id: `player-${p.id}`,
    side: 'player' as const,
    slot: {
      side: 'player' as const,
      row: 'front' as const,
      column: STARTER_COLUMNS[i],
    },
    chassis: p.chassis,
    hp: p.hp,
    maxHp: p.hp,
    gambits: p.gambits,
    ruleSlots: p.ruleSlots,
  }))
  const map = generateMap(rng)
  const runState = createRunState(map, playerUnits)

  return { playerUnits, runState, phase: 'map', combatProps: null, seed }
}

/** Derive BattleResult by replaying damage events. */
function extractBattleResult(startHp: Record<string, number>, events: CombatEvent[]): BattleResult {
  const hps: Record<string, number> = { ...startHp }
  let winner: 'player' | 'enemy' = 'enemy'

  for (const e of events) {
    if (e.kind === 'damage_dealt') {
      hps[e.targetId] = Math.max(0, (hps[e.targetId] ?? 0) - e.amount)
    } else if (e.kind === 'combat_ended') {
      winner = e.winner
    }
  }

  return { winner, survivingHp: hps }
}

/** Resolve a full combat to completion and collect all events. */
function resolveCombat(
  seed: number,
  playerUnits: Unit[],
  enemyUnits: Unit[],
): { units: UnitInfo[]; events: CombatEvent[] } {
  const units: UnitInfo[] = [...playerUnits, ...enemyUnits].map(u => ({
    id: u.id,
    side: u.side,
    slot: u.slot,
    hp: u.hp,
    maxHp: u.maxHp,
    chassis: u.chassis,
  }))

  let state = createCombat(seed, playerUnits, enemyUnits)
  const events: CombatEvent[] = []

  let guard = 0
  while (!isCombatOver(state)) {
    if (++guard > 200) throw new Error('combat did not end within 200 rounds')
    const result = resolveRound(state)
    events.push(...result.events)
    state = result.state
  }

  return { units, events }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function App() {
  const [ctx, setCtx] = useState<RunContext>(startRun)
  const playbackSpeedRef = useRef<PlaybackSpeed>(1)

  // ── Always-on preview pages (used by docs + tooling) ────────────────────
  const search = new URLSearchParams(window.location.search)
  if (search.get('preview') === 'chassis') return <ChassisPreview />

  // ── Dev debug pages ──────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    const page = search.get('debug')
    if (page === 'units') return <DebugUnits />
    if (page === 'scene') return <DebugScene />
    if (page === 'audio') return <DebugAudio />
  }

  // ── Map ─────────────────────────────────────────────────────────────────

  const handleNodeSelect = useCallback((nodeId: string) => {
    initAudio()
    setCtx(prev => {
      const movedRun = selectNode(prev.runState, nodeId)
      const targetNode = prev.runState.graph.nodes.find(n => n.id === nodeId)

      // Repair Bay: apply the heal and stay on the map screen — no fight.
      if (targetNode?.type === 'repair_bay') {
        const healedRun = applyRepairBay(movedRun)
        const newPlayerUnits: Unit[] = prev.playerUnits.map(u => ({
          ...u,
          hp: healedRun.hpSnapshot[u.id] ?? u.hp,
        }))
        return {
          ...prev,
          runState: healedRun,
          playerUnits: newPlayerUnits,
          phase: 'map',
        }
      }

      return {
        ...prev,
        runState: movedRun,
        phase: 'gambit-editor',
      }
    })
  }, [])

  // ── Gambit editor ────────────────────────────────────────────────────────

  const handleRun = useCallback((gambits: Record<string, GambitList>) => {
    setCtx(prev => {
      // Apply updated gambits to playerUnits.
      const updatedUnits: Unit[] = prev.playerUnits.map(u => ({
        ...u,
        gambits: gambits[u.id] ?? u.gambits,
        hp: prev.runState.hpSnapshot[u.id] ?? u.hp,
      }))

      // Determine enemy lineup based on node type.
      const currentNode = prev.runState.graph.nodes.find(n => n.id === prev.runState.currentNodeId)
      let enemyUnits
      if (currentNode?.type === 'boss') {
        enemyUnits = bossEncounterFixture().enemyUnits
      } else if (currentNode?.type === 'elite') {
        // Use the run seed mixed with the node id so each elite node draws
        // deterministically and two elites in the same run can roll different
        // fixtures (or the same — Q-R6 doesn't require de-duplication).
        const eliteSeed = prev.seed ^ hashString(currentNode.id)
        enemyUnits = drawEliteEncounter(createRng(eliteSeed)).enemyUnits
      } else {
        enemyUnits = walkingSkeletonFixture().enemyUnits
      }

      // Only non-sitting-out player units fight.
      const fightingUnits = updatedUnits.filter(u => !prev.runState.sittingOut.has(u.id))

      const { units, events } = resolveCombat(prev.seed, fightingUnits, enemyUnits)

      return {
        ...prev,
        playerUnits: updatedUnits,
        phase: 'combat',
        combatProps: { units, events },
      }
    })
  }, [])

  // ── Combat continue ──────────────────────────────────────────────────────

  const handleContinue = useCallback(() => {
    setCtx(prev => {
      if (!prev.combatProps) return prev

      // Compute which player units fought (not sitting out).
      const fightingIds = new Set(
        prev.playerUnits.filter(u => !prev.runState.sittingOut.has(u.id)).map(u => u.id),
      )

      // Build starting HP map for only the fighting units.
      const startHp: Record<string, number> = {}
      for (const id of fightingIds) {
        startHp[id] = prev.runState.hpSnapshot[id] ?? 0
      }

      const result = extractBattleResult(startHp, prev.combatProps.events)
      const newRunState = applyBattleResult(prev.runState, result)

      // Sync player unit HP from the new snapshot.
      const newPlayerUnits: Unit[] = prev.playerUnits.map(u => ({
        ...u,
        hp: newRunState.hpSnapshot[u.id] ?? u.hp,
      }))

      if (newRunState.status === 'lost') {
        return { ...prev, playerUnits: newPlayerUnits, runState: newRunState, phase: 'game-over' }
      }
      if (newRunState.status === 'won') {
        return { ...prev, playerUnits: newPlayerUnits, runState: newRunState, phase: 'victory' }
      }

      // Non-boss victory → draw reward offers deterministically from the run
      // seed + the node id, stash them on RunState, and show the reward screen
      // before returning to the map (T-6.13, Q-R8).
      const currentNode = newRunState.graph.nodes.find(n => n.id === newRunState.currentNodeId)
      if (currentNode?.type === 'combat' || currentNode?.type === 'elite') {
        const rewardSeed = prev.seed ^ hashString(`reward:${currentNode.id}`)
        const offers = drawRewardOffers(
          createRng(rewardSeed),
          currentNode.type === 'elite' ? 'elite' : 'combat',
        )
        return {
          ...prev,
          playerUnits: newPlayerUnits,
          runState: setPendingRewardOffers(newRunState, offers),
          phase: 'reward',
        }
      }

      return { ...prev, playerUnits: newPlayerUnits, runState: newRunState, phase: 'map' }
    })
  }, [])

  // ── Reward pick ──────────────────────────────────────────────────────────

  const handleRewardCommit = useCallback(
    (reward: Reward, selection: RewardSelection, newUnit?: Unit) => {
      setCtx(prev => {
        let nextRunState = applyReward(prev.runState, reward, selection)
        nextRunState = clearPendingRewardOffers(nextRunState)

        // new_unit: append the freshly-created Unit to playerUnits so the
        // gambit editor, map strip, and combat resolver see it next fight.
        let nextPlayerUnits = prev.playerUnits
        if (reward.kind === 'new_unit' && newUnit) {
          nextPlayerUnits = [...prev.playerUnits, newUnit]
        }

        // Keep each Unit's hp field in sync with the RunState snapshot so the
        // map strip and editor render the post-reward values (heal_one /
        // heal_all mutate hpSnapshot, not the Unit objects).
        nextPlayerUnits = nextPlayerUnits.map(u => ({
          ...u,
          hp: nextRunState.hpSnapshot[u.id] ?? u.hp,
        }))

        return {
          ...prev,
          playerUnits: nextPlayerUnits,
          runState: nextRunState,
          phase: 'map',
        }
      })
    },
    [],
  )

  // ── Try Again ────────────────────────────────────────────────────────────

  const handleTryAgain = useCallback(() => {
    setCtx(startRun())
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  const { phase, runState, playerUnits, combatProps } = ctx

  if (phase === 'game-over') {
    return <GameOverScreen onTryAgain={handleTryAgain} />
  }

  if (phase === 'victory') {
    return <VictoryScreen onTryAgain={handleTryAgain} />
  }

  if (phase === 'map') {
    // Build squad status entries for the map screen strip.
    const unitStatuses = playerUnits.map(u => ({
      id: u.id,
      name: u.id, // will be overridden below
      chassis: u.chassis,
      hp: runState.hpSnapshot[u.id] ?? u.hp,
      maxHp: u.maxHp,
      sittingOut: runState.sittingOut.has(u.id),
    }))

    return (
      <MapScreen runState={runState} unitStatuses={unitStatuses} onNodeSelect={handleNodeSelect} />
    )
  }

  if (phase === 'gambit-editor') {
    const editorUnits: UnitEditorEntry[] = playerUnits
      .filter(u => !runState.sittingOut.has(u.id))
      .map(u => ({
        id: u.id,
        name: u.chassis.charAt(0).toUpperCase() + u.chassis.slice(1).replace('-', ' '),
        chassis: u.chassis,
        currentHp: runState.hpSnapshot[u.id] ?? u.hp,
        maxHp: u.maxHp,
        gambits: u.gambits,
        ruleSlots: runState.ruleSlotsMap[u.id] ?? u.ruleSlots ?? 2,
      }))

    return <GambitEditorScreen units={editorUnits} onRun={handleRun} />
  }

  if (phase === 'reward' && runState.pendingRewardOffers) {
    return (
      <RewardScreen
        offers={runState.pendingRewardOffers}
        playerUnits={playerUnits}
        runState={runState}
        onCommit={handleRewardCommit}
      />
    )
  }

  if (phase === 'combat' && combatProps) {
    return (
      <CombatScreen
        {...combatProps}
        onContinue={handleContinue}
        initialSpeed={playbackSpeedRef.current}
        onSpeedChange={s => {
          playbackSpeedRef.current = s
        }}
      />
    )
  }

  return null
}
