// Gambit editor screen — v0.7 M5 update.
//
// Now accepts a dynamic list of units (any chassis, any count) instead of
// hardcoded vacuum / butler tabs.  One tab per unit; each tab holds that
// unit's current gambit list.  HP is shown per unit so the player can see
// carry-over damage when planning their strategy.
//
// T-7.14: Action picker now lists only installed active modules (no more
// getAttacksForChassis). T-7.15: Module panel shows installed modules and
// computed stats alongside the gambit list.

import { useState } from 'react'
import type { Rule, GambitList, ActiveModuleDef, PassiveModuleDef } from '../../../logic'
import { RULE_SLOT_CAP } from '../../../logic'
import { GambitList as GambitListComponent } from './GambitList'
import { ModulePanel } from './ModulePanel'
import styles from './GambitEditorScreen.module.css'

/**
 * Default gambit list for a new unit tab. Length matches the unit's current
 * `ruleSlots`; the first rule uses the unit's first installed active module,
 * the rest fall back to idle.
 */
function defaultGambits(activeModules: ActiveModuleDef[], ruleSlots: number): Rule[] {
  if (ruleSlots <= 0) return []
  const firstModule = activeModules[0]
  const defaultTarget = firstModule?.actionKind === 'heal' ? 'any_ally' : 'nearest_enemy'
  const first: Rule = {
    condition: { kind: 'target_exists', target: defaultTarget },
    action:
      firstModule != null
        ? { kind: firstModule.id, target: defaultTarget }
        : { kind: 'idle' as const },
  }
  return [
    first,
    ...Array.from(
      { length: ruleSlots - 1 },
      (): Rule => ({
        condition: { kind: 'always' },
        action: { kind: 'idle' },
      }),
    ),
  ]
}

/**
 * Fit a gambit list to the unit's current `ruleSlots` (T-6.14). If the unit
 * gained a slot via reward, pad with idle rules so the player sees the newly-
 * available row. If a unit somehow has more rules than slots (shouldn't
 * happen in practice), truncate.
 */
function fitGambitsToSlots(gambits: Rule[], ruleSlots: number): Rule[] {
  if (gambits.length === ruleSlots) return gambits
  if (gambits.length > ruleSlots) return gambits.slice(0, ruleSlots)
  const pad: Rule[] = Array.from({ length: ruleSlots - gambits.length }, () => ({
    condition: { kind: 'always' as const },
    action: { kind: 'idle' as const },
  }))
  return [...gambits, ...pad]
}

export interface UnitEditorEntry {
  id: string
  name: string
  chassis: string
  currentHp: number
  maxHp: number
  gambits: Rule[]
  /** Per-unit rule-slot count. Derived from chassis base + passive effects. */
  ruleSlots: number
  /** Resolved defs of installed active modules (for action picker). */
  activeModuleDefs: ActiveModuleDef[]
  /** Resolved defs of installed passive modules (for module panel). */
  passiveModuleDefs: PassiveModuleDef[]
  /** Number of effective active slots (chassis base + passive bonuses). */
  effectiveActiveSlots: number
  /** Bonus damage from passive modules. */
  bonusDamage: number
  /** Fixed passive slot count from chassis definition. */
  passiveSlots: number
  /** Chassis base HP (before passive bonuses). */
  baseHp: number
}

interface Props {
  units: UnitEditorEntry[]
  onRun: (gambits: Record<string, GambitList>) => void
}

export function GambitEditorScreen({ units, onRun }: Props) {
  const [activeTab, setActiveTab] = useState(units[0]?.id ?? '')

  // Initialise one gambit state entry per unit, fit to its current ruleSlots.
  const [gambitMap, setGambitMap] = useState<Record<string, Rule[]>>(() => {
    const map: Record<string, Rule[]> = {}
    for (const u of units) {
      const base =
        u.gambits.length > 0 ? [...u.gambits] : defaultGambits(u.activeModuleDefs, u.ruleSlots)
      map[u.id] = fitGambitsToSlots(base, u.ruleSlots)
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
        <div className={styles.editorLayout}>
          <section className={styles.gambitSection}>
            <h2 className={styles.unitName}>
              {activeUnit.name}
              <span className={styles.slotSummary}>
                {activeUnit.ruleSlots} / {RULE_SLOT_CAP} rule slots
              </span>
            </h2>
            <GambitListComponent
              rules={
                gambitMap[activeUnit.id] ??
                defaultGambits(activeUnit.activeModuleDefs, activeUnit.ruleSlots)
              }
              onChange={rules => setGambits(activeUnit.id, rules)}
              activeModuleDefs={activeUnit.activeModuleDefs}
              ruleSlots={activeUnit.ruleSlots}
              ruleSlotCap={RULE_SLOT_CAP}
            />
          </section>
          <ModulePanel unit={activeUnit} />
        </div>
      )}
    </div>
  )
}
