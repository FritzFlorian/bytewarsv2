// Combat screen — the only screen in v0.1.
//
// T-3.1: wires the logic layer to the render layer.
// On "Start Combat", runs the full walking-skeleton fight to completion
// (createCombat → loop resolveRound → isCombatOver) and passes the accumulated
// event log to <CombatScene> for animated playback. Speed is controlled here
// and passed down as a prop.

import { useState } from 'react'
import {
  createCombat,
  resolveRound,
  isCombatOver,
  walkingSkeletonFixture,
} from '../../../logic'
import type { CombatEvent } from '../../../logic'
import { CombatScene } from '../../../render/CombatScene'
import type { UnitInfo, PlaybackSpeed } from '../../../render/CombatScene'
import styles from './CombatScreen.module.css'

interface CombatData {
  units: UnitInfo[]
  events: CombatEvent[]
}

/** Run the walking-skeleton fight to completion and return the full event log. */
function runCombat(seed: number): CombatData {
  const { playerUnits, enemyUnits } = walkingSkeletonFixture()

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
    if (++guard > 100) throw new Error('combat did not end within 100 rounds')
    const result = resolveRound(state)
    events.push(...result.events)
    state = result.state
  }

  return { units, events }
}

export function CombatScreen() {
  const [combatData, setCombatData] = useState<CombatData | null>(null)
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)

  function handleStartCombat() {
    setCombatData(runCombat(42))
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
        <button
          className={styles.startButton}
          onClick={handleStartCombat}
          disabled={combatData !== null}
        >
          Start Combat
        </button>
        {combatData && (
          <select
            className={styles.speedSelect}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value) as PlaybackSpeed)}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={10}>10×</option>
          </select>
        )}
      </header>

      {combatData ? (
        <CombatScene
          units={combatData.units}
          events={combatData.events}
          speed={speed}
        />
      ) : (
        <p className={styles.emptyState}>Press "Start Combat" to begin.</p>
      )}
    </div>
  )
}
