// ModulePanel — read-only module inspector in the gambit editor (T-7.15).
//
// Shows installed active and passive modules with stats, plus computed stats
// summary. Read-only between fights — all module changes happen through rewards.

import type { UnitEditorEntry } from './GambitEditorScreen'
import styles from './ModulePanel.module.css'

function activeModuleStats(mod: {
  actionKind: string
  attackProperties?: { damage: number; cooldown: number; initialCooldown: number }
  healProperties?: { healAmount: number; cooldown: number; initialCooldown: number }
}): string {
  if (mod.actionKind === 'attack' && mod.attackProperties) {
    const parts = [`${mod.attackProperties.damage} dmg`]
    if (mod.attackProperties.cooldown > 0) parts.push(`${mod.attackProperties.cooldown}-round cd`)
    if (mod.attackProperties.initialCooldown > 0) parts.push(`unavail. round 1`)
    return parts.join(', ')
  }
  if (mod.actionKind === 'heal' && mod.healProperties) {
    const parts = [`${mod.healProperties.healAmount} heal`]
    if (mod.healProperties.cooldown > 0) parts.push(`${mod.healProperties.cooldown}-round cd`)
    if (mod.healProperties.initialCooldown > 0) parts.push(`unavail. round 1`)
    return parts.join(', ')
  }
  return ''
}

const EFFECT_LABELS: Record<string, string> = {
  bonus_hp: 'HP',
  bonus_damage: 'Damage',
  extra_active_slot: 'Active slot',
  extra_rule_slot: 'Rule slot',
}

interface Props {
  unit: UnitEditorEntry
}

export function ModulePanel({ unit }: Props) {
  const activeCount = unit.activeModuleDefs.length
  const passiveCount = unit.passiveModuleDefs.length
  const hpFromPassives = unit.maxHp - unit.baseHp

  return (
    <aside className={styles.panel}>
      <h3 className={styles.heading}>Modules</h3>

      {/* Active modules */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          Active
          <span className={styles.slotCount}>
            {activeCount}/{unit.effectiveActiveSlots}
          </span>
        </h4>
        {unit.activeModuleDefs.length === 0 ? (
          <p className={styles.empty}>No active modules</p>
        ) : (
          <ul className={styles.moduleList}>
            {unit.activeModuleDefs.map(m => (
              <li key={m.id} className={styles.moduleItem}>
                <span className={styles.moduleName}>{m.name}</span>
                <span className={styles.moduleType}>
                  {m.actionKind === 'heal' ? 'Heal' : 'Attack'}
                </span>
                <span className={styles.moduleStats}>{activeModuleStats(m)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Passive modules */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          Passive
          <span className={styles.slotCount}>
            {passiveCount}/{unit.passiveSlots}
          </span>
        </h4>
        {unit.passiveModuleDefs.length === 0 ? (
          <p className={styles.empty}>No passive modules</p>
        ) : (
          <ul className={styles.moduleList}>
            {unit.passiveModuleDefs.map((m, i) => (
              <li key={`${m.id}-${i}`} className={styles.moduleItem}>
                <span className={styles.moduleName}>{m.name}</span>
                <span className={styles.moduleStats}>
                  {m.effects.map(e => `+${e.value} ${EFFECT_LABELS[e.kind] ?? e.kind}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Computed stats summary */}
      <div className={styles.statsSection}>
        <h4 className={styles.sectionTitle}>Stats</h4>
        <dl className={styles.statsList}>
          <div className={styles.statRow}>
            <dt>HP</dt>
            <dd>
              {unit.maxHp}
              {hpFromPassives > 0 && (
                <span className={styles.statBreakdown}>
                  ({unit.baseHp} + {hpFromPassives})
                </span>
              )}
            </dd>
          </div>
          {unit.bonusDamage > 0 && (
            <div className={styles.statRow}>
              <dt>Bonus Damage</dt>
              <dd>+{unit.bonusDamage}</dd>
            </div>
          )}
          <div className={styles.statRow}>
            <dt>Rule Slots</dt>
            <dd>{unit.ruleSlots}</dd>
          </div>
          <div className={styles.statRow}>
            <dt>Active Slots</dt>
            <dd>{unit.effectiveActiveSlots}</dd>
          </div>
        </dl>
      </div>
    </aside>
  )
}
