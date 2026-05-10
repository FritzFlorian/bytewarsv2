// StarterDraftScreen — v0.7 run-start unit pick (T-7.10).
//
// Two sequential picks. Each shows 3 random presets from the starter pool.
// Player picks one unit per round. Cards display chassis silhouette, name,
// HP, and installed modules with stats.

import { useState } from 'react'
import type { StarterPreset, ActiveModuleDef, PassiveModuleDef } from '../../../logic'
import { getChassisDef, getActiveModuleDef, getPassiveModuleDef } from '../../../logic'
import { CHASSIS_ENTRIES } from '../ChassisPreview/ChassisPreview'
import styles from './StarterDraftScreen.module.css'

// ── Props ────────────────────────────────────────────────────────────

export interface StarterDraftScreenProps {
  /** Current pick number (1 or 2). */
  pick: 1 | 2
  /** The 3 preset options to display for this pick. */
  options: StarterPreset[]
  /** Called when the player confirms a pick. */
  onPick: (preset: StarterPreset) => void
}

// ── Helpers ──────────────────────────────────────────────────────────

function chassisLabel(c: string): string {
  return c.charAt(0).toUpperCase() + c.slice(1).replace('_', '-').replace('-', ' ')
}

function activeModuleStats(def: ActiveModuleDef): string {
  switch (def.actionKind) {
    case 'attack': {
      const { damage, cooldown, initialCooldown, appliesStatus } = def.attackProperties
      let s = `${damage} dmg`
      if (appliesStatus) s += ` +${appliesStatus.kind}`
      if (cooldown > 0) s += ` / CD ${cooldown}`
      if (initialCooldown > 0) s += ` / init ${initialCooldown}`
      return s
    }
    case 'heal': {
      const { healAmount, cooldown, initialCooldown } = def.healProperties
      let s = `${healAmount} heal`
      if (cooldown > 0) s += ` / CD ${cooldown}`
      if (initialCooldown > 0) s += ` / init ${initialCooldown}`
      return s
    }
    case 'buff': {
      const { status, cooldown, initialCooldown } = def.buffProperties
      let s = `buff ${status.kind} ${status.magnitude} (${status.duration}r)`
      if (cooldown > 0) s += ` / CD ${cooldown}`
      if (initialCooldown > 0) s += ` / init ${initialCooldown}`
      return s
    }
    case 'debuff': {
      const { status, cooldown, initialCooldown } = def.debuffProperties
      let s = `debuff ${status.kind} ${status.magnitude} (${status.duration}r)`
      if (cooldown > 0) s += ` / CD ${cooldown}`
      if (initialCooldown > 0) s += ` / init ${initialCooldown}`
      return s
    }
  }
}

function passiveEffectLabel(def: PassiveModuleDef): string {
  return def.effects
    .map(e => {
      switch (e.kind) {
        case 'bonus_hp':
          return `+${e.value} HP`
        case 'bonus_damage':
          return `+${e.value} dmg`
        case 'extra_active_slot':
          return `+${e.value} active slot`
        case 'extra_rule_slot':
          return `+${e.value} rule slot`
      }
    })
    .join(', ')
}

// ── Preset card ─────────────────────────────────────────────────────

function PresetCard({
  preset,
  isSelected,
  onSelect,
}: {
  preset: StarterPreset
  isSelected: boolean
  onSelect: () => void
}) {
  const chassis = getChassisDef(preset.chassis)
  const entry = CHASSIS_ENTRIES.find(e => e.chassis === preset.chassis)
  const ChassisComponent = entry?.Component

  return (
    <button
      type="button"
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={onSelect}
    >
      <div className={styles.cardHeader}>
        <div className={styles.chassisSilhouette}>{ChassisComponent && <ChassisComponent />}</div>
        <div className={styles.cardInfo}>
          <span className={styles.cardName}>{preset.name}</span>
          <span className={styles.cardChassis}>{chassisLabel(preset.chassis)}</span>
          <span className={styles.cardHp}>{chassis.baseHp} HP</span>
        </div>
      </div>

      <div className={styles.moduleSection}>
        <span className={styles.moduleSectionLabel}>Active Modules</span>
        <ul className={styles.moduleList}>
          {preset.activeModules.map(modId => {
            const def = getActiveModuleDef(modId)
            return (
              <li key={modId} className={styles.moduleItem}>
                <span className={styles.moduleName}>{def.name}</span>
                <span className={styles.moduleStats}>{activeModuleStats(def)}</span>
              </li>
            )
          })}
        </ul>
      </div>

      {preset.passiveModules.length > 0 && (
        <div className={styles.moduleSection}>
          <span className={styles.moduleSectionLabel}>Passive Modules</span>
          <ul className={styles.moduleList}>
            {preset.passiveModules.map(modId => {
              const def = getPassiveModuleDef(modId)
              return (
                <li key={modId} className={styles.moduleItem}>
                  <span className={styles.moduleName}>{def.name}</span>
                  <span className={styles.moduleStats}>{passiveEffectLabel(def)}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </button>
  )
}

// ── Main component ──────────────────────────────────────────────────

export function StarterDraftScreen({ pick, options, onPick }: StarterDraftScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const selectedPreset = selectedIndex !== null ? options[selectedIndex] : null

  function handleConfirm() {
    if (selectedPreset) onPick(selectedPreset)
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Draft Unit {pick} of 2</h1>
        <span className={styles.subtitle}>Pick a unit for your starting squad.</span>
      </header>

      <div className={styles.cardsRow}>
        {options.map((preset, i) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isSelected={selectedIndex === i}
            onSelect={() => setSelectedIndex(i)}
          />
        ))}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.confirmButton}
          disabled={selectedPreset === null}
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </footer>
    </div>
  )
}
