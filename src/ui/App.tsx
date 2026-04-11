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

import { useState, useCallback } from 'react'
import {
  createCombat,
  resolveRound,
  isCombatOver,
  loadPlayerSquad,
  generateMap,
  createRunState,
  selectNode,
  applyBattleResult,
  bossEncounterFixture,
  walkingSkeletonFixture,
  createRng,
} from '../logic'
import type { CombatEvent, GambitList, Unit, RunState, BattleResult } from '../logic'
import { GambitEditorScreen } from './screens/GambitEditor/GambitEditorScreen'
import type { UnitEditorEntry } from './screens/GambitEditor/GambitEditorScreen'
import { CombatScreen } from './screens/Combat/CombatScreen'
import type { CombatScreenProps } from './screens/Combat/CombatScreen'
import { MapScreen } from './screens/RunMap/MapScreen'
import { GameOverScreen } from './screens/GameOver/GameOverScreen'
import { VictoryScreen } from './screens/Victory/VictoryScreen'
import { DebugUnits } from './screens/Combat/_DebugUnits'
import { DebugScene } from '../render/CombatScene'
import { DebugAudio } from '../audio/_DebugAudio'
import { initAudio } from '../audio/engine'
import type { UnitInfo } from '../render/CombatScene'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppPhase = 'map' | 'gambit-editor' | 'combat' | 'game-over' | 'victory'

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

/** Build a fresh run from the player-squad JSON. */
function startRun(): RunContext {
  const seed = Date.now()
  const rng = createRng(seed)
  const playerUnits = loadPlayerSquad()
  const map = generateMap(rng)
  const runState = createRunState(map, playerUnits)

  return { playerUnits, runState, phase: 'map', combatProps: null, seed }
}

/** Derive BattleResult by replaying damage events. */
function extractBattleResult(
  startHp: Record<string, number>,
  events: CombatEvent[],
): BattleResult {
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

  // ── Dev debug pages ──────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    const page = new URLSearchParams(window.location.search).get('debug')
    if (page === 'units') return <DebugUnits />
    if (page === 'scene') return <DebugScene />
    if (page === 'audio') return <DebugAudio />
  }

  // ── Map ─────────────────────────────────────────────────────────────────

  const handleNodeSelect = useCallback(
    (nodeId: string) => {
      initAudio()
      setCtx(prev => ({
        ...prev,
        runState: selectNode(prev.runState, nodeId),
        phase: 'gambit-editor',
      }))
    },
    [],
  )

  // ── Gambit editor ────────────────────────────────────────────────────────

  const handleRun = useCallback(
    (gambits: Record<string, GambitList>) => {
      setCtx(prev => {
        // Apply updated gambits to playerUnits.
        const updatedUnits: Unit[] = prev.playerUnits.map(u => ({
          ...u,
          gambits: gambits[u.id] ?? u.gambits,
          hp: prev.runState.hpSnapshot[u.id] ?? u.hp,
        }))

        // Determine enemy lineup based on node type.
        const currentNode = prev.runState.graph.nodes.find(
          n => n.id === prev.runState.currentNodeId,
        )
        const enemyUnits = currentNode?.type === 'boss'
          ? bossEncounterFixture().enemyUnits
          : walkingSkeletonFixture().enemyUnits

        // Only non-sitting-out player units fight.
        const fightingUnits = updatedUnits.filter(
          u => !prev.runState.sittingOut.has(u.id),
        )

        const { units, events } = resolveCombat(
          prev.seed,
          fightingUnits,
          enemyUnits,
        )

        return {
          ...prev,
          playerUnits: updatedUnits,
          phase: 'combat',
          combatProps: { units, events },
        }
      })
    },
    [],
  )

  // ── Combat continue ──────────────────────────────────────────────────────

  const handleContinue = useCallback(() => {
    setCtx(prev => {
      if (!prev.combatProps) return prev

      // Compute which player units fought (not sitting out).
      const fightingIds = new Set(
        prev.playerUnits
          .filter(u => !prev.runState.sittingOut.has(u.id))
          .map(u => u.id),
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

      return { ...prev, playerUnits: newPlayerUnits, runState: newRunState, phase: 'map' }
    })
  }, [])

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
      <MapScreen
        runState={runState}
        unitStatuses={unitStatuses}
        onNodeSelect={handleNodeSelect}
      />
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
      }))

    return <GambitEditorScreen units={editorUnits} onRun={handleRun} />
  }

  if (phase === 'combat' && combatProps) {
    return <CombatScreen {...combatProps} onContinue={handleContinue} />
  }

  return null
}
