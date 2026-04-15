// RewardScreen — v0.6 post-combat reward selection (T-6.13).
//
// Shows 3 reward offers as cards. Picking a card surfaces the offer's sub-
// picker (if any), then a Confirm button commits the choice.
//
// Sub-pickers per reward kind:
//   heal_one  → pick a unit (living, dead, or sitting-out — all valid, Q-R5)
//   heal_all  → no sub-picker; auto-applies to every living unit
//   rule_slot → pick a unit not already at the cap (capped units disabled)
//   new_unit  → pick an empty grid slot (3 rows × 3 columns = 9 slots)
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
} from '../../../logic'
import { getStarterPreset, RULE_SLOT_CAP } from '../../../logic'
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

function offerTitle(r: Reward): string {
  switch (r.kind) {
    case 'heal_one':
      return 'Full Heal (one unit)'
    case 'heal_all':
      return 'Partial Heal (all units)'
    case 'rule_slot':
      return '+1 Rule Slot'
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
    case 'rule_slot':
      return `Add one rule slot to a unit (cap ${RULE_SLOT_CAP}).`
    case 'new_unit':
      // getStarterPreset throws on unknown id, but r.presetId is typed as a
      // valid id so this is safe; still, guard for display.
      try {
        const p = getStarterPreset(r.presetId)
        return `Add ${p.name} (${chassisLabel(p.chassis)}) to your squad.`
      } catch {
        return `Add a new unit to your squad.`
      }
  }
}

function offerIcon(r: Reward): string {
  switch (r.kind) {
    case 'heal_one':
      return '♥'
    case 'heal_all':
      return '✚'
    case 'rule_slot':
      return '⚙'
    case 'new_unit':
      return '＋'
  }
}

function slotKey(s: SlotRef): string {
  return `${s.side}-${s.row}-${s.column}`
}

// ── Sub-picker: pick a unit ──────────────────────────────────────────

interface UnitPickerProps {
  units: Unit[]
  runState: RunState
  /** (unitId) → whether this unit is a valid target for the chosen reward. */
  isEligible: (unitId: string) => boolean
  /** Optional label shown next to each unit (e.g. slot count). */
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
                  {isOccupied ? '•' : '＋'}
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
  const [heal1Target, setHeal1Target] = useState<string | null>(null)
  const [ruleSlotTarget, setRuleSlotTarget] = useState<string | null>(null)
  const [newUnitSlot, setNewUnitSlot] = useState<SlotRef | null>(null)

  const selectedOffer = selectedIndex !== null ? offers[selectedIndex] : null

  // Pick a card → reset that card's own sub-selection so old picks don't
  // bleed across if the player changes their mind.
  function handlePickCard(i: number) {
    setSelectedIndex(i)
    setHeal1Target(null)
    setRuleSlotTarget(null)
    setNewUnitSlot(null)
  }

  // Occupied grid slots across *all* player units (including sitting-out —
  // they still own their slot; reviving them shouldn't clash).
  const occupiedSlots = new Set(playerUnits.map(u => slotKey(u.slot)))

  const selection: RewardSelection | null = (() => {
    if (!selectedOffer) return null
    switch (selectedOffer.kind) {
      case 'heal_all':
        return { kind: 'heal_all' }
      case 'heal_one':
        return heal1Target ? { kind: 'heal_one', targetUnitId: heal1Target } : null
      case 'rule_slot':
        return ruleSlotTarget ? { kind: 'rule_slot', targetUnitId: ruleSlotTarget } : null
      case 'new_unit': {
        if (!newUnitSlot) return null
        // Generate a deterministic-ish new unit id: preset + slot so re-clicking
        // the same slot in the same session wouldn't collide.
        const newId = `player-${selectedOffer.presetId}-${slotKey(newUnitSlot)}`
        return { kind: 'new_unit', newUnitId: newId, slot: newUnitSlot }
      }
    }
  })()

  function handleConfirm() {
    if (!selectedOffer || !selection) return
    if (selectedOffer.kind === 'new_unit' && selection.kind === 'new_unit') {
      const preset = getStarterPreset(selectedOffer.presetId)
      const newUnit: Unit = {
        id: selection.newUnitId,
        side: 'player',
        slot: selection.slot,
        chassis: preset.chassis,
        hp: preset.hp,
        maxHp: preset.hp,
        gambits: preset.gambits,
        ruleSlots: preset.ruleSlots,
      }
      onCommit(selectedOffer, selection, newUnit)
    } else {
      onCommit(selectedOffer, selection)
    }
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Reward</h1>
        <span className={styles.subtitle}>Pick one of three offers.</span>
      </header>

      <div className={styles.offersRow}>
        {offers.map((offer, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.offerCard} ${selectedIndex === i ? styles.offerCardSelected : ''}`}
            onClick={() => handlePickCard(i)}
          >
            <span className={styles.offerIcon}>{offerIcon(offer)}</span>
            <span className={styles.offerTitle}>{offerTitle(offer)}</span>
            <span className={styles.offerDescription}>{offerDescription(offer)}</span>
          </button>
        ))}
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

        {selectedOffer?.kind === 'rule_slot' && (
          <>
            <p className={styles.subHeading}>Pick a unit to gain an extra rule slot:</p>
            <UnitPicker
              units={playerUnits}
              runState={runState}
              isEligible={id => (runState.ruleSlotsMap[id] ?? 2) < RULE_SLOT_CAP}
              extraLabel={id =>
                `${runState.ruleSlotsMap[id] ?? 2} / ${RULE_SLOT_CAP} slots${
                  (runState.ruleSlotsMap[id] ?? 2) >= RULE_SLOT_CAP ? ' (capped)' : ''
                }`
              }
              selectedUnitId={ruleSlotTarget}
              onSelect={setRuleSlotTarget}
            />
          </>
        )}

        {selectedOffer?.kind === 'new_unit' && (
          <SlotPicker
            preset={getStarterPreset(selectedOffer.presetId)}
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
