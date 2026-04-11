// GambitSlot — one rule row in the gambit editor.
//
// Renders:
//   [N] [condition picker] [pct? | condition-target?] [→] [action picker] [action-target?]
//
// Conditional fields:
//   condition=self_hp_below  → numeric pct input
//   condition=target_exists  → condition target selector
//   action=attack            → action target selector
//
// Each picker is a SearchableSelect: a text input that filters options
// as the user types, then lets them pick from the narrowed list.

import { useState } from 'react'
import type { Condition, Action, TargetSelector, Rule, AttackId } from '../../../logic'
import { isAttackAction } from '../../../logic'
import { getAttacksForChassis } from '../../../logic'
import type { Chassis } from '../../../logic'
import styles from './GambitSlot.module.css'

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS: { value: Condition['kind']; label: string }[] = [
  { value: 'always', label: 'always' },
  { value: 'self_hp_below', label: 'self HP below' },
  { value: 'target_exists', label: 'target exists' },
]

const TARGET_OPTIONS: { value: TargetSelector; label: string }[] = [
  { value: 'nearest_enemy', label: 'nearest enemy' },
  { value: 'any_enemy', label: 'any enemy' },
  { value: 'self', label: 'self' },
]

function buildActionOptions(chassis: Chassis): { value: Action['kind']; label: string }[] {
  const attacks = getAttacksForChassis(chassis)
  const attackOptions = attacks.map(a => {
    const cdLabel = a.cooldown > 0 ? `, ${a.cooldown}-round cd` : ''
    const initLabel = a.initialCooldown > 0 ? `, unavail. round 1` : ''
    return { value: a.id as AttackId, label: `${a.name} — ${a.damage} dmg${cdLabel}${initLabel}` }
  })
  return [...attackOptions, { value: 'idle' as const, label: 'idle' }]
}

// ---------------------------------------------------------------------------
// SearchableSelect — generic type-filtered dropdown
// ---------------------------------------------------------------------------

interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SearchableSelectProps<T extends string> {
  options: SelectOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
}

function SearchableSelect<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SearchableSelectProps<T>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const currentLabel = options.find(o => o.value === value)?.label ?? value
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  function handleFocus() {
    setQuery('')
    setOpen(true)
  }

  function handleBlur() {
    // Delay so that onMouseDown on an option fires before the dropdown closes
    setTimeout(() => {
      setOpen(false)
      setQuery('')
    }, 150)
  }

  function handleSelect(val: T) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={styles.searchableWrap}>
      <input
        aria-label={ariaLabel}
        className={styles.searchableInput}
        value={open ? query : currentLabel}
        onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        readOnly={!open}
      />
      {open && filtered.length > 0 && (
        <ul className={styles.dropdown} role="listbox">
          {filtered.map(o => (
            <li
              key={o.value}
              className={styles.dropdownItem}
              role="option"
              aria-selected={o.value === value}
              onMouseDown={() => handleSelect(o.value)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Condition/action change helpers — produce valid new types
// ---------------------------------------------------------------------------

function changeConditionKind(
  kind: Condition['kind'],
  current: Condition,
): Condition {
  if (kind === 'always') return { kind: 'always' }
  if (kind === 'self_hp_below') return { kind: 'self_hp_below', pct: 50 }
  // target_exists
  const target =
    current.kind === 'target_exists' ? current.target : 'nearest_enemy'
  return { kind: 'target_exists', target }
}

function changeActionKind(kind: Action['kind'], current: Action): Action {
  if (kind === 'idle') return { kind: 'idle' }
  const target = isAttackAction(current) ? current.target : 'nearest_enemy'
  return { kind: kind as AttackId, target }
}

// ---------------------------------------------------------------------------
// GambitSlot
// ---------------------------------------------------------------------------

export interface GambitSlotProps {
  index: number
  rule: Rule
  onChange: (rule: Rule) => void
  chassis: Chassis
}

export function GambitSlot({ index, rule, onChange, chassis }: GambitSlotProps) {
  const { condition, action } = rule

  function handleConditionKind(kind: Condition['kind']) {
    onChange({ ...rule, condition: changeConditionKind(kind, condition) })
  }

  function handleConditionTarget(target: TargetSelector) {
    if (condition.kind === 'target_exists') {
      onChange({ ...rule, condition: { kind: 'target_exists', target } })
    }
  }

  function handlePct(raw: string) {
    const pct = Math.max(0, Math.min(100, Number(raw)))
    if (condition.kind === 'self_hp_below') {
      onChange({ ...rule, condition: { kind: 'self_hp_below', pct } })
    }
  }

  function handleActionKind(kind: Action['kind']) {
    onChange({ ...rule, action: changeActionKind(kind, action) })
  }

  function handleActionTarget(target: TargetSelector) {
    if (isAttackAction(action)) {
      onChange({ ...rule, action: { kind: action.kind, target } })
    }
  }

  return (
    <div className={styles.slot}>
      <span className={styles.index}>{index + 1}</span>

      {/* Condition picker */}
      <SearchableSelect
        options={CONDITION_OPTIONS}
        value={condition.kind}
        onChange={handleConditionKind}
        ariaLabel={`Condition ${index + 1}`}
      />

      {/* Condition extras */}
      {condition.kind === 'self_hp_below' && (
        <>
          <input
            aria-label={`HP threshold ${index + 1}`}
            className={styles.pctInput}
            type="number"
            min={0}
            max={100}
            value={condition.pct}
            onChange={e => handlePct(e.target.value)}
          />
          <span className={styles.pctLabel}>%</span>
        </>
      )}
      {condition.kind === 'target_exists' && (
        <SearchableSelect
          options={TARGET_OPTIONS}
          value={condition.target}
          onChange={handleConditionTarget}
          ariaLabel={`Condition target ${index + 1}`}
        />
      )}

      <span className={styles.separator}>→</span>

      {/* Action picker */}
      <SearchableSelect
        options={buildActionOptions(chassis)}
        value={action.kind}
        onChange={handleActionKind}
        ariaLabel={`Action ${index + 1}`}
      />

      {/* Action extras */}
      {isAttackAction(action) && (
        <>
          <SearchableSelect
            options={TARGET_OPTIONS}
            value={action.target}
            onChange={handleActionTarget}
            ariaLabel={`Action target ${index + 1}`}
          />
          {(() => {
            const attacks = getAttacksForChassis(chassis)
            const def = attacks.find(a => a.id === action.kind)
            return def?.initialCooldown ? (
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>⚠ not available round 1</span>
            ) : null
          })()}
        </>
      )}
    </div>
  )
}
