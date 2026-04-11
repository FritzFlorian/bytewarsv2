// Gambit editor screen — T-1.1 shell.
//
// Landing page for v0.2. Shows one tab per player unit (Vacuum, Butler).
// Selecting a tab shows that unit's gambit list below.
// Clicking "Run" triggers the combat run and transitions to the combat screen.
//
// T-1.2 adds the real GambitSlot / GambitList components.
// T-1.4 wires Run to createCombat and passes gambit data forward.

import { useState } from 'react'
import styles from './GambitEditorScreen.module.css'

type UnitTab = 'vacuum' | 'butler'

const UNIT_LABELS: Record<UnitTab, string> = {
  vacuum: 'Vacuum',
  butler: 'Butler',
}

const TABS: UnitTab[] = ['vacuum', 'butler']

interface Props {
  onRun: () => void
}

export function GambitEditorScreen({ onRun }: Props) {
  const [activeTab, setActiveTab] = useState<UnitTab>('vacuum')

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
        <p className={styles.placeholder}>Gambit slots — coming in T-1.2</p>
      </section>
    </div>
  )
}
