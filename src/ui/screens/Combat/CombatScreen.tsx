// Combat screen — v0.2.
//
// Receives pre-resolved units and events from App (computed by the gambit
// editor's Run action). Immediately renders CombatScene with autoPlay so
// the fight begins without further user interaction.
//
// Speed control remains here; play/pause/step stay inside CombatScene.

import { useState } from 'react'
import type { CombatEvent } from '../../../logic'
import { CombatScene } from '../../../render/CombatScene'
import type { UnitInfo, PlaybackSpeed } from '../../../render/CombatScene'
import styles from './CombatScreen.module.css'

export interface CombatScreenProps {
  units: UnitInfo[]
  events: CombatEvent[]
}

export function CombatScreen({ units, events }: CombatScreenProps) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
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
      </header>

      <CombatScene units={units} events={events} speed={speed} autoPlay />
    </div>
  )
}
