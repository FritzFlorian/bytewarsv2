// RewardScreen — v0.7 M4 post-combat reward selection (T-7.13).
//
// Shows 3 reward offers as cards. Picking a card surfaces the offer's sub-
// picker (if any), then a Confirm button commits the choice.
//
// Sub-pickers per reward kind:
//   heal_one      → pick a unit (living, dead, or sitting-out — all valid, Q-R5)
//   heal_all      → no sub-picker; auto-applies to every living unit
//   module_drop   → pick a unit with a free slot of the matching type
//                   (if no unit has space, card is marked "no space" and unselectable)
//   remove_module → pick a unit, then pick a module to remove
//                   (cannot remove last active module)
//   new_unit      → pick an empty grid slot (3 rows × 3 columns = 9 slots)
//
// The screen stays mounted until onCommit fires; App.tsx swaps phases after.

import { useState } from 'react'
import type {
  Reward,
  RewardSelection,
  Unit,
  RunState,
  SlotRef,
  Row,
  Column,
  StarterPreset,
  ActiveModuleDef,
  PassiveModuleDef,
} from '../../../logic'
import {
  getRecruitmentPreset,
  getModuleDef,
  getActiveModuleDef,
  getPassiveModuleDef,
  getChassisDef,
  toUnitInstance,
} from '../../../logic'
import styles from './RewardScreen.module.css'

// ── Props ────────────────────────────────────────────────────────────

export interface RewardScreenProps {
  offers: Reward[]
  playerUnits: Unit[]
  runState: RunState
  onCommit: (reward: Reward, selection: RewardSelection, newUnit?: Unit) => void
}

// ── Helpers ──────────────────────────────────────────────────────────

const ROWS: Row[] = ['front', 'middle', 'back']
const COLUMNS: Column[] = [0, 1, 2]

function chassisLabel(c: string): string {
  return c.charAt(0).toUpperCase() + c.slice(1).replace('_', '-').replace('-', ' ')
}

function moduleDescription(moduleDef: ActiveModuleDef | PassiveModuleDef): string {
  if (moduleDef.type === 'active') {
    if (moduleDef.actionKind === 'attack') {
      const p = moduleDef.attackProperties
      const parts = [`${p.damage} dmg`]
      if (p.cooldown > 0) parts.push(`CD ${p.cooldown}`)
      return parts.join(', ')
    }
    const p = moduleDef.healProperties
    const parts = [`${p.healAmount} heal`]
    if (p.cooldown > 0) parts.push(`CD ${p.cooldown}`)
    return parts.join(', ')
  }
  // Passive
  return moduleDef.effects
    .map(e => {
      switch (e.kind) {
        case 'bonus_hp':
          return `+${e.value} HP`
        case 'bonus_damage':
          return `+${e.value} damage`
        case 'extra_active_slot':
          return `+${e.value} active slot`
        case 'extra_rule_slot':
          return `+${e.value} rule slot`
      }
    })
    .join(', ')
}

function offerTitle(r: Reward): string {
  switch (r.kind) {
    case 'heal_one':
      return 'Full Heal (one unit)'
    case 'heal_all':
      return 'Partial Heal (all units)'
    case 'module_drop': {
      const def = getModuleDef(r.moduleId)
      return def.name
    }
    case 'remove_module':
      return 'Remove Module'
    case 'new_unit':
      return 'New Unit'
  }
}

function offerDescription(r: Reward): string {
  switch (r.kind) {
    case 'heal_one':
      return 'Restore one unit to full HP. Revives a sitting-out unit.'
    case 'heal_all':
      return 'Heal every living unit by 50% of max HP.'
    case 'module_drop': {
      const def = getModuleDef(r.moduleId)
      const typeLabel = def.type === 'active' ? 'Active' : 'Passive'
      return `${typeLabel} module: ${moduleDescription(def)}`
    }
    case 'remove_module':
      return 'Destroy one installed module to free up a slot.'
    case 'new_unit':
      try {
        const p = getRecruitmentPreset(r.presetId)
        return `Add ${p.name} (${chassisLabel(p.chassis)}) to your squad.`
      } catch {
        return `Add a new unit to your squad.`
      }
  }
}

function offerIcon(r: Reward): string {
  switch (r.kind) {
    case 'heal_one':
      return '\u2665'
    case 'heal_all':
      return '\u271A'
    case 'module_drop': {
      const def = getModuleDef(r.moduleId)
      return def.type === 'active' ? '\u2694' : '\u26E8'
    }
    case 'remove_module':
      return '\u2716'
    case 'new_unit':
      return '\uFF0B'
  }
}

/** Check if any player unit can accept a module of the given type. */
function anyUnitCanInstall(units: Unit[], moduleId: string): boolean {
  const def = getModuleDef(moduleId)
  return units.some(u => (def.type === 'active' ? u.canInstallActive() : u.canInstallPassive()))
}

/** Check if any player unit has a removable module. */
function anyUnitHasRemovableModule(units: Unit[]): boolean {
  return units.some(u => u.activeModules.length > 1 || u.passiveModules.length > 0)
}

function slotKey(s: SlotRef): string {
  return `${s.side}-${s.row}-${s.column}`
}

// ── Sub-picker: pick a unit ──────────────────────────────────────────

interface UnitPickerProps {
  units: Unit[]
  runState: RunState
  isEligible: (unitId: string) => boolean
  extraLabel?: (unitId: string) => string
  selectedUnitId: string | null
  onSelect: (unitId: string) => void
}

function UnitPicker({
  units,
  runState,
  isEligible,
  extraLabel,
  selectedUnitId,
  onSelect,
}: UnitPickerProps) {
  return (
    <ul className={styles.unitList}>
      {units.map(u => {
        const hp = runState.hpSnapshot[u.id] ?? 0
        const max = runState.maxHpMap[u.id] ?? u.maxHp
        const sittingOut = runState.sittingOut.has(u.id)
        const eligible = isEligible(u.id)
        const isSelected = selectedUnitId === u.id
        const cls = [
          styles.unitItem,
          eligible ? '' : styles.unitItemDisabled,
          isSelected ? styles.unitItemSelected : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <li key={u.id}>
            <button
              type="button"
              className={cls}
              disabled={!eligible}
              onClick={() => onSelect(u.id)}
            >
              <span className={styles.unitItemName}>{chassisLabel(u.chassis)}</span>
              <span className={styles.unitItemHp}>
                {hp} / {max} HP
                {sittingOut && <span className={styles.unitItemTag}> (sitting out)</span>}
              </span>
              {extraLabel && <span className={styles.unitItemExtra}>{extraLabel(u.id)}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ── Sub-picker: pick a module to remove ─────────────────────────────

interface ModulePickerProps {
  unit: Unit
  selectedIndex: number | null
  selectedType: 'active' | 'passive' | null
  onSelect: (index: number, type: 'active' | 'passive', defId: string) => void
}

function ModulePicker({ unit, selectedIndex, selectedType, onSelect }: ModulePickerProps) {
  return (
    <div className={styles.modulePickerList}>
      {unit.activeModules.map((m, i) => {
        const def = getActiveModuleDef(m.defId)
        const isLast = unit.activeModules.length <= 1
        const isSelected = selectedType === 'active' && selectedIndex === i
        const cls = [
          styles.modulePickerItem,
          isLast ? styles.modulePickerItemDisabled : '',
          isSelected ? styles.modulePickerItemSelected : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={`active-${i}`}
            type="button"
            className={cls}
            disabled={isLast}
            onClick={() => onSelect(i, 'active', m.defId)}
          >
            <span className={styles.modulePickerLabel}>
              <span className={styles.modulePickerType}>Active</span> {def.name}
            </span>
            <span className={styles.modulePickerStats}>{moduleDescription(def)}</span>
            {isLast && <span className={styles.modulePickerTag}>last active — cannot remove</span>}
          </button>
        )
      })}
      {unit.passiveModules.map((m, i) => {
        const def = getPassiveModuleDef(m.defId)
        const isSelected = selectedType === 'passive' && selectedIndex === i
        const cls = [styles.modulePickerItem, isSelected ? styles.modulePickerItemSelected : '']
          .filter(Boolean)
          .join(' ')
        return (
          <button
            key={`passive-${i}`}
            type="button"
            className={cls}
            onClick={() => onSelect(i, 'passive', m.defId)}
          >
            <span className={styles.modulePickerLabel}>
              <span className={styles.modulePickerType}>Passive</span> {def.name}
            </span>
            <span className={styles.modulePickerStats}>{moduleDescription(def)}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Sub-picker: pick a grid slot ─────────────────────────────────────

interface SlotPickerProps {
  preset: StarterPreset
  occupied: Set<string>
  selectedSlot: SlotRef | null
  onSelect: (slot: SlotRef) => void
}

function SlotPicker({ preset, occupied, selectedSlot, onSelect }: SlotPickerProps) {
  const selectedKey = selectedSlot ? slotKey(selectedSlot) : null
  return (
    <div>
      <p className={styles.subHeading}>
        Place <strong>{preset.name}</strong> ({chassisLabel(preset.chassis)}) in an empty slot:
      </p>
      <div className={styles.slotGrid}>
        {ROWS.map(row => (
          <div key={row} className={styles.slotRow}>
            <span className={styles.slotRowLabel}>{row}</span>
            {COLUMNS.map(column => {
              const ref: SlotRef = { side: 'player', row, column }
              const key = slotKey(ref)
              const isOccupied = occupied.has(key)
              const isSelected = selectedKey === key
              const cls = [
                styles.slotCell,
                isOccupied ? styles.slotCellOccupied : styles.slotCellEmpty,
                isSelected ? styles.slotCellSelected : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <button
                  key={key}
                  type="button"
                  className={cls}
                  disabled={isOccupied}
                  onClick={() => onSelect(ref)}
                  aria-label={`slot ${row} ${column}`}
                >
                  {isOccupied ? '\u2022' : '\uFF0B'}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────

export function RewardScreen({ offers, playerUnits, runState, onCommit }: RewardScreenProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Sub-picker state
  const [heal1Target, setHeal1Target] = useState<string | null>(null)
  const [moduleDropTarget, setModuleDropTarget] = useState<string | null>(null)
  const [removeModuleUnitId, setRemoveModuleUnitId] = useState<string | null>(null)
  const [removeModuleIndex, setRemoveModuleIndex] = useState<number | null>(null)
  const [removeModuleType, setRemoveModuleType] = useState<'active' | 'passive' | null>(null)
  const [removeModuleDefId, setRemoveModuleDefId] = useState<string | null>(null)
  const [newUnitSlot, setNewUnitSlot] = useState<SlotRef | null>(null)

  const selectedOffer = selectedIndex !== null ? offers[selectedIndex] : null

  function handlePickCard(i: number) {
    setSelectedIndex(i)
    setHeal1Target(null)
    setModuleDropTarget(null)
    setRemoveModuleUnitId(null)
    setRemoveModuleIndex(null)
    setRemoveModuleType(null)
    setRemoveModuleDefId(null)
    setNewUnitSlot(null)
  }

  function handleRemoveUnitSelect(unitId: string) {
    setRemoveModuleUnitId(unitId)
    setRemoveModuleIndex(null)
    setRemoveModuleType(null)
    setRemoveModuleDefId(null)
  }

  function handleRemoveModuleSelect(index: number, type: 'active' | 'passive', defId: string) {
    setRemoveModuleIndex(index)
    setRemoveModuleType(type)
    setRemoveModuleDefId(defId)
  }

  // Occupied grid slots.
  const occupiedSlots = new Set(playerUnits.map(u => slotKey(u.slot)))

  // Check if module_drop offers are selectable (any unit has a free slot).
  function isModuleDropSelectable(offer: Reward): boolean {
    if (offer.kind !== 'module_drop') return true
    return anyUnitCanInstall(playerUnits, offer.moduleId)
  }

  // Check if remove_module offers are selectable.
  function isRemoveModuleSelectable(): boolean {
    return anyUnitHasRemovableModule(playerUnits)
  }

  function isOfferSelectable(offer: Reward): boolean {
    if (offer.kind === 'module_drop') return isModuleDropSelectable(offer)
    if (offer.kind === 'remove_module') return isRemoveModuleSelectable()
    return true
  }

  const selection: RewardSelection | null = (() => {
    if (!selectedOffer) return null
    switch (selectedOffer.kind) {
      case 'heal_all':
        return { kind: 'heal_all' }
      case 'heal_one':
        return heal1Target ? { kind: 'heal_one', targetUnitId: heal1Target } : null
      case 'module_drop':
        return moduleDropTarget ? { kind: 'module_drop', targetUnitId: moduleDropTarget } : null
      case 'remove_module':
        return removeModuleUnitId !== null &&
          removeModuleIndex !== null &&
          removeModuleType !== null &&
          removeModuleDefId !== null
          ? {
              kind: 'remove_module',
              targetUnitId: removeModuleUnitId,
              moduleIndex: removeModuleIndex,
              moduleType: removeModuleType,
              moduleDefId: removeModuleDefId,
            }
          : null
      case 'new_unit': {
        if (!newUnitSlot) return null
        const newId = `player-${selectedOffer.presetId}-${slotKey(newUnitSlot)}`
        return { kind: 'new_unit', newUnitId: newId, slot: newUnitSlot }
      }
    }
  })()

  function handleConfirm() {
    if (!selectedOffer || !selection) return
    if (selectedOffer.kind === 'new_unit' && selection.kind === 'new_unit') {
      const preset = getRecruitmentPreset(selectedOffer.presetId)
      const newUnit = toUnitInstance(preset, selection.newUnitId, 'player', selection.slot)
      onCommit(selectedOffer, selection, newUnit)
    } else {
      onCommit(selectedOffer, selection)
    }
  }

  const removeModuleUnit = removeModuleUnitId
    ? (playerUnits.find(u => u.id === removeModuleUnitId) ?? null)
    : null

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reward</h1>
        <span className={styles.subtitle}>Pick one of three offers.</span>
      </header>

      <div className={styles.offersRow}>
        {offers.map((offer, i) => {
          const selectable = isOfferSelectable(offer)
          return (
            <button
              key={i}
              type="button"
              className={`${styles.offerCard} ${selectedIndex === i ? styles.offerCardSelected : ''} ${!selectable ? styles.offerCardDisabled : ''}`}
              onClick={() => selectable && handlePickCard(i)}
              disabled={!selectable}
            >
              <span className={styles.offerIcon}>{offerIcon(offer)}</span>
              <span className={styles.offerTitle}>{offerTitle(offer)}</span>
              <span className={styles.offerDescription}>{offerDescription(offer)}</span>
              {!selectable && <span className={styles.offerNoSpace}>no space</span>}
            </button>
          )
        })}
      </div>

      <section className={styles.subSection}>
        {selectedOffer === null && (
          <p className={styles.placeholder}>Select an offer above to continue.</p>
        )}

        {selectedOffer?.kind === 'heal_all' && (
          <p className={styles.subHeading}>
            Every living unit will regain 50% of max HP. No further choice needed.
          </p>
        )}

        {selectedOffer?.kind === 'heal_one' && (
          <>
            <p className={styles.subHeading}>Pick a unit to fully heal:</p>
            <UnitPicker
              units={playerUnits}
              runState={runState}
              isEligible={() => true}
              selectedUnitId={heal1Target}
              onSelect={setHeal1Target}
            />
          </>
        )}

        {selectedOffer?.kind === 'module_drop' && (
          <>
            <p className={styles.subHeading}>
              Pick a unit to install <strong>{getModuleDef(selectedOffer.moduleId).name}</strong>{' '}
              on:
            </p>
            <UnitPicker
              units={playerUnits}
              runState={runState}
              isEligible={id => {
                const unit = playerUnits.find(u => u.id === id)
                if (!unit) return false
                const def = getModuleDef(selectedOffer.moduleId)
                return def.type === 'active' ? unit.canInstallActive() : unit.canInstallPassive()
              }}
              extraLabel={id => {
                const unit = playerUnits.find(u => u.id === id)
                if (!unit) return ''
                const def = getModuleDef(selectedOffer.moduleId)
                if (def.type === 'active') {
                  return `${unit.activeModules.length}/${unit.effectiveActiveSlots} active`
                }
                const chassisDef = getChassisDef(unit.chassis)
                return `${unit.passiveModules.length}/${chassisDef.passiveSlots} passive`
              }}
              selectedUnitId={moduleDropTarget}
              onSelect={setModuleDropTarget}
            />
          </>
        )}

        {selectedOffer?.kind === 'remove_module' && (
          <>
            <p className={styles.subHeading}>Pick a unit, then a module to remove:</p>
            <UnitPicker
              units={playerUnits}
              runState={runState}
              isEligible={id => {
                const unit = playerUnits.find(u => u.id === id)
                if (!unit) return false
                return unit.activeModules.length > 1 || unit.passiveModules.length > 0
              }}
              selectedUnitId={removeModuleUnitId}
              onSelect={handleRemoveUnitSelect}
            />
            {removeModuleUnit && (
              <div className={styles.modulePickerSection}>
                <p className={styles.subHeading}>Select module to destroy:</p>
                <ModulePicker
                  unit={removeModuleUnit}
                  selectedIndex={removeModuleIndex}
                  selectedType={removeModuleType}
                  onSelect={handleRemoveModuleSelect}
                />
              </div>
            )}
          </>
        )}

        {selectedOffer?.kind === 'new_unit' && (
          <SlotPicker
            preset={getRecruitmentPreset(selectedOffer.presetId)}
            occupied={occupiedSlots}
            selectedSlot={newUnitSlot}
            onSelect={setNewUnitSlot}
          />
        )}
      </section>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.confirmButton}
          disabled={selection === null}
          onClick={handleConfirm}
        >
          Confirm
        </button>
      </footer>
    </div>
  )
}
