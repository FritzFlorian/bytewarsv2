// Gambit editor screen — T-1.1 shell, T-1.2 gambit list.
//
// Landing page for v0.2. Shows one tab per player unit (Vacuum, Butler).
// Each unit has 4 gambit slots (GambitList). Switching tabs preserves each
// unit's gambits. "Run" is wired to the combat screen in T-1.4.

import { useState } from 'react'
import type { Rule } from '../../../logic'
import { GambitList } from './GambitList'
import styles from './GambitEditorScreen.module.css'

type UnitTab = 'vacuum' | 'butler'

const UNIT_LABELS: Record<UnitTab, string> = {
  vacuum: 'Vacuum',
  butler: 'Butler',
}

const TABS: UnitTab[] = ['vacuum', 'butler']

const SLOT_COUNT = 4

/** Default gambit list: attack nearest enemy on slot 1, idle on the rest. */
function defaultGambits(): Rule[] {
  return [
    { condition: { kind: 'target_exists', target: 'nearest_enemy' }, action: { kind: 'attack', target: 'nearest_enemy' } },
    ...Array.from({ length: SLOT_COUNT - 1 }, (): Rule => ({
      condition: { kind: 'always' },
      action: { kind: 'idle' },
    })),
  ]
}

interface Props {
  onRun: () => void
}

export function GambitEditorScreen({ onRun }: Props) {
  const [activeTab, setActiveTab] = useState<UnitTab>('vacuum')
  const [vacuumGambits, setVacuumGambits] = useState<Rule[]>(defaultGambits)
  const [butlerGambits, setButlerGambits] = useState<Rule[]>(defaultGambits)

  const gambits = activeTab === 'vacuum' ? vacuumGambits : butlerGambits
  const setGambits = activeTab === 'vacuum' ? setVacuumGambits : setButlerGambits

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
        <button className={styles.runButton} onClick={onRun}>Run</button>
      </header>

      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {UNIT_LABELS[tab]}
          </button>
        ))}
      </div>

      <section className={styles.gambitSection}>
        <h2 className={styles.unitName}>{UNIT_LABELS[activeTab]}</h2>
        <GambitList rules={gambits} onChange={setGambits} />
      </section>
    </div>
  )
}
