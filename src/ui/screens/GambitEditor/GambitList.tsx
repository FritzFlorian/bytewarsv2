// GambitList — renders 4 GambitSlot rows for one unit.
//
// The parent (GambitEditorScreen) owns the rule array and passes it down.
// Drag-to-reorder is added in T-1.3.

import type { Rule } from '../../../logic'
import { GambitSlot } from './GambitSlot'

export interface GambitListProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
}

export function GambitList({ rules, onChange }: GambitListProps) {
  function handleSlotChange(index: number, updated: Rule) {
    const next = rules.map((r, i) => (i === index ? updated : r))
    onChange(next)
  }

  return (
    <div>
      {rules.map((rule, i) => (
        <GambitSlot
          key={i}
          index={i}
          rule={rule}
          onChange={updated => handleSlotChange(i, updated)}
        />
      ))}
    </div>
  )
}
