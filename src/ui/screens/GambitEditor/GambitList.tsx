// GambitList — renders 4 GambitSlot rows for one unit.
//
// T-1.2: composes GambitSlot; parent owns the rule array.
// T-1.3: drag-to-reorder using the HTML5 drag-and-drop API (no library).
//        Dragging a slot above another swaps their positions in the list.

import { useRef } from 'react'
import type { Rule } from '../../../logic'
import type { Chassis } from '../../../logic'
import { GambitSlot } from './GambitSlot'
import styles from './GambitList.module.css'

export interface GambitListProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
  chassis: Chassis
  /** Number of active rule slots for this unit (T-6.14). `rules.length` should
   *  equal this; locked rows beyond it are rendered up to `ruleSlotCap`. */
  ruleSlots: number
  /** Absolute cap on rule slots (Q-R4 — 6). Rows between `ruleSlots` and
   *  `ruleSlotCap` are shown as locked placeholders: visible so the player
   *  can see the ceiling, inert so they can't edit them. */
  ruleSlotCap: number
}

export function GambitList({ rules, onChange, chassis, ruleSlots, ruleSlotCap }: GambitListProps) {
  /** Index of the slot currently being dragged. */
  const dragIndex = useRef<number | null>(null)

  function handleSlotChange(index: number, updated: Rule) {
    onChange(rules.map((r, i) => (i === index ? updated : r)))
  }

  function handleDragStart(index: number) {
    dragIndex.current = index
  }

  function handleDragOver(e: React.DragEvent, overIndex: number) {
    e.preventDefault() // allow drop
    const from = dragIndex.current
    if (from === null || from === overIndex) return
    // Reorder: move `from` to `overIndex`
    const next = [...rules]
    const [moved] = next.splice(from, 1)
    next.splice(overIndex, 0, moved)
    dragIndex.current = overIndex
    onChange(next)
  }

  function handleDragEnd() {
    dragIndex.current = null
  }

  const activeCount = Math.min(rules.length, ruleSlots)
  const lockedCount = Math.max(0, ruleSlotCap - ruleSlots)

  return (
    <div>
      {rules.slice(0, activeCount).map((rule, i) => (
        <div
          key={i}
          className={styles.draggableRow}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDragEnd={handleDragEnd}
        >
          <span className={styles.dragHandle} aria-hidden>
            ⠿
          </span>
          <GambitSlot
            index={i}
            rule={rule}
            onChange={updated => handleSlotChange(i, updated)}
            chassis={chassis}
          />
        </div>
      ))}
      {Array.from({ length: lockedCount }).map((_, i) => (
        <div key={`locked-${i}`} className={styles.lockedRow} aria-label="locked rule slot">
          <span className={styles.dragHandle} aria-hidden>
            ⠿
          </span>
          <div className={styles.lockedSlot}>
            <span className={styles.lockedIndex}>{activeCount + i + 1}</span>
            <span className={styles.lockedLabel}>🔒 locked — unlock with a +rule-slot reward</span>
          </div>
        </div>
      ))}
    </div>
  )
}
