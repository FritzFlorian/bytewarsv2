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
import type { Condition, Action, TargetSelector, Rule } from '../../../logic'
import styles from './GambitSlot.module.css'

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS: { value: Condition['kind']; label: string }[] = [
  { value: 'always', label: 'always' },
  { value: 'self_hp_below', label: 'self HP below' },
  { value: 'target_exists', label: 'target exists' },
]

const ACTION_OPTIONS: { value: Action['kind']; label: string }[] = [
  { value: 'idle', label: 'idle' },
  { value: 'attack', label: 'attack' },
]

const TARGET_OPTIONS: { value: TargetSelector; label: string }[] = [
  { value: 'nearest_enemy', label: 'nearest enemy' },
  { value: 'any_enemy', label: 'any enemy' },
  { value: 'self', label: 'self' },
]

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
  const target = current.kind === 'attack' ? current.target : 'nearest_enemy'
  return { kind: 'attack', target }
}

// ---------------------------------------------------------------------------
// GambitSlot
// ---------------------------------------------------------------------------

export interface GambitSlotProps {
  index: number
  rule: Rule
  onChange: (rule: Rule) => void
}

export function GambitSlot({ index, rule, onChange }: GambitSlotProps) {
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
    if (action.kind === 'attack') {
      onChange({ ...rule, action: { kind: 'attack', target } })
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
        options={ACTION_OPTIONS}
        value={action.kind}
        onChange={handleActionKind}
        ariaLabel={`Action ${index + 1}`}
      />

      {/* Action extras */}
      {action.kind === 'attack' && (
        <SearchableSelect
          options={TARGET_OPTIONS}
          value={action.target}
          onChange={handleActionTarget}
          ariaLabel={`Action target ${index + 1}`}
        />
      )}
    </div>
  )
}
