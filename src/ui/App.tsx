// v0.2: GambitEditorScreen is the landing page.
//
// "Run" reads the editor's gambit lists, merges them into the walking-skeleton
// fixture (enemy units stay hardcoded), resolves the full fight, and navigates
// to CombatScreen which begins playback automatically.
//
// Dev-only debug pages are gated behind import.meta.env.DEV. Vite replaces
// that constant with `false` in production builds, so the branches are
// dead-code-eliminated and the debug imports are tree-shaken out.

import { useState } from 'react'
import {
  createCombat,
  resolveRound,
  isCombatOver,
  walkingSkeletonFixture,
} from '../logic'
import type { CombatEvent, GambitList } from '../logic'
import { GambitEditorScreen } from './screens/GambitEditor/GambitEditorScreen'
import { CombatScreen } from './screens/Combat/CombatScreen'
import type { CombatScreenProps } from './screens/Combat/CombatScreen'
import { DebugUnits } from './screens/Combat/_DebugUnits'
import { DebugScene } from '../render/CombatScene'

/** Run a full combat with the player's chosen gambits merged into the fixture. */
function runCombat(
  vacuumGambits: GambitList,
  butlerGambits: GambitList,
): CombatScreenProps {
  const { playerUnits, enemyUnits } = walkingSkeletonFixture()

  // Override player unit gambits with what the editor produced.
  const mergedPlayerUnits = playerUnits.map(u => {
    if (u.chassis === 'vacuum') return { ...u, gambits: vacuumGambits }
    if (u.chassis === 'butler') return { ...u, gambits: butlerGambits }
    return u
  })

  const units = [...mergedPlayerUnits, ...enemyUnits].map(u => ({
    id: u.id,
    side: u.side,
    slot: u.slot,
    maxHp: u.maxHp,
    chassis: u.chassis,
  }))

  let state = createCombat(42, mergedPlayerUnits, enemyUnits)
  const events: CombatEvent[] = []

  let guard = 0
  while (!isCombatOver(state)) {
    if (++guard > 100) throw new Error('combat did not end within 100 rounds')
    const result = resolveRound(state)
    events.push(...result.events)
    state = result.state
  }

  return { units, events }
}

export default function App() {
  const [combatProps, setCombatProps] = useState<CombatScreenProps | null>(null)

  if (import.meta.env.DEV) {
    const page = new URLSearchParams(window.location.search).get('debug')
    if (page === 'units') return <DebugUnits />
    if (page === 'scene') return <DebugScene />
  }

  function handleRun(vacuumGambits: GambitList, butlerGambits: GambitList) {
    setCombatProps(runCombat(vacuumGambits, butlerGambits))
  }

  if (combatProps) {
    return <CombatScreen {...combatProps} />
  }
  return <GambitEditorScreen onRun={handleRun} />
}
