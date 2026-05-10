// GambitSlot — one rule row in the gambit editor.
//
// Renders:
//   [N] [condition picker] [pct? | condition-target?] [→] [action picker] [action-target?]
//
// Conditional fields:
//   condition=self_hp_below  → numeric pct input
//   condition=target_exists  → condition target selector
//   action=module            → action target selector (enemy targets for attacks, ally for heals)
//
// T-7.14: Action picker lists only installed active modules (not chassis-filtered).
// Target selectors are context-sensitive: attack modules offer enemy targets,
// heal modules offer ally targets.

import { useState } from 'react'
import type { Condition, Action, TargetSelector, Rule, ActiveModuleDef } from '../../../logic'
import { isModuleAction } from '../../../logic'
import styles from './GambitSlot.module.css'

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS: { value: Condition['kind']; label: string }[] = [
  { value: 'always', label: 'always' },
  { value: 'self_hp_below', label: 'self HP below' },
  { value: 'target_exists', label: 'target exists' },
]

const ENEMY_TARGET_OPTIONS: { value: TargetSelector; label: string }[] = [
  { value: 'nearest_enemy', label: 'nearest enemy' },
  { value: 'any_enemy', label: 'any enemy' },
]

const ALLY_TARGET_OPTIONS: { value: TargetSelector; label: string }[] = [
  { value: 'any_ally', label: 'any ally' },
  { value: 'weakest_ally', label: 'weakest ally' },
  { value: 'self', label: 'self' },
]

const ALL_TARGET_OPTIONS: { value: TargetSelector; label: string }[] = [
  { value: 'nearest_enemy', label: 'nearest enemy' },
  { value: 'any_enemy', label: 'any enemy' },
  { value: 'any_ally', label: 'any ally' },
  { value: 'weakest_ally', label: 'weakest ally' },
  { value: 'self', label: 'self' },
]

function buildActionOptions(
  activeModuleDefs: ActiveModuleDef[],
): { value: Action['kind']; label: string }[] {
  const moduleOptions = activeModuleDefs.map(m => {
    if (m.actionKind === 'attack') {
      const cdLabel =
        m.attackProperties.cooldown > 0 ? `, ${m.attackProperties.cooldown}-round cd` : ''
      const initLabel = m.attackProperties.initialCooldown > 0 ? `, unavail. round 1` : ''
      return {
        value: m.id,
        label: `${m.name} — ${m.attackProperties.damage} dmg${cdLabel}${initLabel}`,
      }
    }
    // heal
    const cdLabel = m.healProperties.cooldown > 0 ? `, ${m.healProperties.cooldown}-round cd` : ''
    const initLabel = m.healProperties.initialCooldown > 0 ? `, unavail. round 1` : ''
    return {
      value: m.id,
      label: `${m.name} — ${m.healProperties.healAmount} heal${cdLabel}${initLabel}`,
    }
  })
  return [...moduleOptions, { value: 'idle' as const, label: 'idle' }]
}

/** Get the target options appropriate for the selected action module. */
function getActionTargetOptions(
  actionKind: string,
  activeModuleDefs: ActiveModuleDef[],
): { value: TargetSelector; label: string }[] {
  const mod = activeModuleDefs.find(m => m.id === actionKind)
  if (!mod) return ALL_TARGET_OPTIONS
  return mod.actionKind === 'heal' ? ALLY_TARGET_OPTIONS : ENEMY_TARGET_OPTIONS
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

function changeConditionKind(kind: Condition['kind'], current: Condition): Condition {
  if (kind === 'always') return { kind: 'always' }
  if (kind === 'self_hp_below') return { kind: 'self_hp_below', pct: 50 }
  // target_exists
  const target = current.kind === 'target_exists' ? current.target : 'nearest_enemy'
  return { kind: 'target_exists', target }
}

function changeActionKind(
  kind: Action['kind'],
  current: Action,
  activeModuleDefs: ActiveModuleDef[],
): Action {
  if (kind === 'idle') return { kind: 'idle' }
  // Pick a sensible default target based on module type.
  const mod = activeModuleDefs.find(m => m.id === kind)
  const defaultTarget: TargetSelector =
    mod?.actionKind === 'heal' ? 'weakest_ally' : 'nearest_enemy'
  const target = isModuleAction(current) ? current.target : defaultTarget
  return { kind, target }
}

// ---------------------------------------------------------------------------
// GambitSlot
// ---------------------------------------------------------------------------

export interface GambitSlotProps {
  index: number
  rule: Rule
  onChange: (rule: Rule) => void
  activeModuleDefs: ActiveModuleDef[]
}

export function GambitSlot({ index, rule, onChange, activeModuleDefs }: GambitSlotProps) {
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
    onChange({ ...rule, action: changeActionKind(kind, action, activeModuleDefs) })
  }

  function handleActionTarget(target: TargetSelector) {
    if (isModuleAction(action)) {
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
          options={ALL_TARGET_OPTIONS}
          value={condition.target}
          onChange={handleConditionTarget}
          ariaLabel={`Condition target ${index + 1}`}
        />
      )}

      <span className={styles.separator}>→</span>

      {/* Action picker */}
      <SearchableSelect
        options={buildActionOptions(activeModuleDefs)}
        value={action.kind}
        onChange={handleActionKind}
        ariaLabel={`Action ${index + 1}`}
      />

      {/* Action extras */}
      {isModuleAction(action) && (
        <>
          <SearchableSelect
            options={getActionTargetOptions(action.kind, activeModuleDefs)}
            value={action.target}
            onChange={handleActionTarget}
            ariaLabel={`Action target ${index + 1}`}
          />
          {(() => {
            const mod = activeModuleDefs.find(m => m.id === action.kind)
            if (!mod) return null
            const ic =
              mod.actionKind === 'attack'
                ? mod.attackProperties.initialCooldown
                : mod.healProperties.initialCooldown
            return ic > 0 ? (
              <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>⚠ not available round 1</span>
            ) : null
          })()}
        </>
      )}
    </div>
  )
}
