// Combat screen — the only screen in v0.1.
//
// This component does NOT import from src/render/. That wiring happens in T-3.1
// when the render layer (Track C) is ready. The <div id="combat-scene-mount">
// below is the mount point where CombatScene will be plugged in.

import { useGameState } from '../../hooks/useGameState'
import styles from './CombatScreen.module.css'

// Build the 9-slot grids (3 rows × 3 columns).
const ROWS = ['front', 'middle', 'back'] as const
const COLS = [0, 1, 2] as const

function SlotGrid({ side }: { side: 'player' | 'enemy' }) {
  return (
    <div className={styles.slotGrid} data-side={side}>
      {ROWS.flatMap(row =>
        COLS.map(col => (
          <div
            key={`${side}-${row}-${col}`}
            className={styles.slot}
            data-row={row}
            data-col={col}
          />
        ))
      )}
    </div>
  )
}

export function CombatScreen() {
  const [state, dispatch] = useGameState()

  function handleStartCombat() {
    dispatch({ kind: 'start_combat', seed: 42 })
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
        <button
          className={styles.startButton}
          onClick={handleStartCombat}
          disabled={state !== null}
        >
          Start Combat
        </button>
      </header>

      <section className={styles.battlefield}>
        <SlotGrid side="player" />
        {/* Mount point for the render layer's CombatScene (wired in T-3.1) */}
        <div id="combat-scene-mount" className={styles.sceneMountPoint} />
        <SlotGrid side="enemy" />
      </section>

      <footer className={styles.controls}>
        {/* Play / pause / step controls — inert until T-3.1 wires the render layer */}
        <button className={styles.controlButton} disabled>⏮ Restart</button>
        <button className={styles.controlButton} disabled>⏸ Pause</button>
        <button className={styles.controlButton} disabled>⏭ Step</button>
        <select className={styles.speedSelect} defaultValue="1" disabled>
          <option value="0.5">0.5×</option>
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="10">10×</option>
        </select>
      </footer>

      {state && (
        <div className={styles.status}>
          Round {state.battlefield.round} ·{' '}
          {state.finished
            ? `${state.finished === 'player' ? 'Player' : 'Enemy'} wins`
            : 'In progress'}
        </div>
      )}
    </div>
  )
}
