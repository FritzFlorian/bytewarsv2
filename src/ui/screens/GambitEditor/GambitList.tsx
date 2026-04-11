// GambitList — renders 4 GambitSlot rows for one unit.
//
// T-1.2: composes GambitSlot; parent owns the rule array.
// T-1.3: drag-to-reorder using the HTML5 drag-and-drop API (no library).
//        Dragging a slot above another swaps their positions in the list.

import { useRef } from 'react'
import type { Rule } from '../../../logic'
import { GambitSlot } from './GambitSlot'
import styles from './GambitList.module.css'

export interface GambitListProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
}

export function GambitList({ rules, onChange }: GambitListProps) {
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

  return (
    <div>
      {rules.map((rule, i) => (
        <div
          key={i}
          className={styles.draggableRow}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={e => handleDragOver(e, i)}
          onDragEnd={handleDragEnd}
        >
          <span className={styles.dragHandle} aria-hidden>⠿</span>
          <GambitSlot
            index={i}
            rule={rule}
            onChange={updated => handleSlotChange(i, updated)}
          />
        </div>
      ))}
    </div>
  )
}
