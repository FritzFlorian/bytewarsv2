// Gambit editor screen — v0.4 update.
//
// Now accepts a dynamic list of units (any chassis, any count) instead of
// hardcoded vacuum / butler tabs.  One tab per unit; each tab holds that
// unit's current gambit list.  HP is shown per unit so the player can see
// carry-over damage when planning their strategy.

import { useState } from 'react'
import type { Rule, GambitList } from '../../../logic'
import { GambitList as GambitListComponent } from './GambitList'
import styles from './GambitEditorScreen.module.css'

const SLOT_COUNT = 4

/** Default gambit list for a new unit tab. */
function defaultGambits(): Rule[] {
  return [
    { condition: { kind: 'target_exists', target: 'nearest_enemy' }, action: { kind: 'attack', target: 'nearest_enemy' } },
    ...Array.from({ length: SLOT_COUNT - 1 }, (): Rule => ({
      condition: { kind: 'always' },
      action: { kind: 'idle' },
    })),
  ]
}

export interface UnitEditorEntry {
  id: string
  name: string
  chassis: string
  currentHp: number
  maxHp: number
  gambits: Rule[]
}

interface Props {
  units: UnitEditorEntry[]
  onRun: (gambits: Record<string, GambitList>) => void
}

export function GambitEditorScreen({ units, onRun }: Props) {
  const [activeTab, setActiveTab] = useState(units[0]?.id ?? '')

  // Initialise one gambit state entry per unit from the provided gambits.
  const [gambitMap, setGambitMap] = useState<Record<string, Rule[]>>(() => {
    const map: Record<string, Rule[]> = {}
    for (const u of units) {
      map[u.id] = u.gambits.length > 0 ? [...u.gambits] : defaultGambits()
    }
    return map
  })

  function setGambits(unitId: string, rules: Rule[]) {
    setGambitMap(prev => ({ ...prev, [unitId]: rules }))
  }

  function handleRun() {
    onRun(gambitMap)
  }

  const activeUnit = units.find(u => u.id === activeTab) ?? units[0]

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
        <button className={styles.runButton} onClick={handleRun} disabled={units.length === 0}>
          Run
        </button>
      </header>

      <div className={styles.tabBar}>
        {units.map(u => {
          const hpPct = u.maxHp > 0 ? Math.round((u.currentHp / u.maxHp) * 100) : 0
          return (
            <button
              key={u.id}
              className={`${styles.tab} ${activeTab === u.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(u.id)}
            >
              {u.name}
              <span style={{ fontSize: '0.65rem', opacity: 0.7, marginLeft: '0.3rem' }}>
                {hpPct}%
              </span>
            </button>
          )
        })}
      </div>

      {activeUnit && (
        <section className={styles.gambitSection}>
          <h2 className={styles.unitName}>{activeUnit.name}</h2>
          <GambitListComponent
            rules={gambitMap[activeUnit.id] ?? defaultGambits()}
            onChange={rules => setGambits(activeUnit.id, rules)}
          />
        </section>
      )}
    </div>
  )
}
