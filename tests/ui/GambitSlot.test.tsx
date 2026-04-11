// @vitest-environment jsdom
//
// GambitSlot unit tests — T-1.2 acceptance criteria:
//   - condition=self_hp_below shows pct input
//   - condition=target_exists shows condition target selector
//   - condition=always shows neither
//   - action=idle hides action target selector
//   - action=named_attack shows action target selector
//   - Selecting a new condition via the dropdown fires onChange with the correct rule

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { GambitSlot } from '../../src/ui/screens/GambitEditor/GambitSlot'
import type { Rule } from '../../src/logic'

afterEach(() => cleanup())

// ---------------------------------------------------------------------------
// Rendering based on rule prop — no interaction needed
// ---------------------------------------------------------------------------

describe('GambitSlot — conditional field visibility', () => {
  it('always + idle: no pct, no target selectors', () => {
    const rule: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<GambitSlot index={0} rule={rule} onChange={() => {}} chassis="vacuum" />)
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('self_hp_below + idle: shows pct input, no target selectors', () => {
    const rule: Rule = { condition: { kind: 'self_hp_below', pct: 50 }, action: { kind: 'idle' } }
    render(<GambitSlot index={0} rule={rule} onChange={() => {}} chassis="vacuum" />)
    expect(screen.getByLabelText('HP threshold 1')).toBeTruthy()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('target_exists + idle: shows condition target selector, no pct', () => {
    const rule: Rule = {
      condition: { kind: 'target_exists', target: 'nearest_enemy' },
      action: { kind: 'idle' },
    }
    render(<GambitSlot index={0} rule={rule} onChange={() => {}} chassis="vacuum" />)
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.getByLabelText('Condition target 1')).toBeTruthy()
    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('always + named attack: shows action target selector, no condition extras', () => {
    const rule: Rule = {
      condition: { kind: 'always' },
      action: { kind: 'quick_jab', target: 'nearest_enemy' },
    }
    render(<GambitSlot index={0} rule={rule} onChange={() => {}} chassis="vacuum" />)
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
    expect(screen.getByLabelText('Action target 1')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Interaction — stateful wrapper so the slot reflects prop changes
// ---------------------------------------------------------------------------

function SlotWrapper({ initialRule, chassis = 'vacuum' as const }: { initialRule: Rule; chassis?: 'vacuum' | 'butler' | 'qa-rig' | 'overseer' }) {
  const [rule, setRule] = useState(initialRule)
  return <GambitSlot index={0} rule={rule} onChange={setRule} chassis={chassis} />
}

describe('GambitSlot — interaction', () => {
  it('selecting self_hp_below from the condition dropdown shows the pct input', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} />)

    // Open the condition dropdown
    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)

    // Click the "self HP below" option
    const option = screen.getByRole('option', { name: 'self HP below' })
    fireEvent.mouseDown(option)

    // pct input should now be visible
    expect(screen.getByLabelText('HP threshold 1')).toBeTruthy()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
  })

  it('selecting target_exists shows the condition target selector', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} />)

    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)

    const option = screen.getByRole('option', { name: 'target exists' })
    fireEvent.mouseDown(option)

    expect(screen.getByLabelText('Condition target 1')).toBeTruthy()
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
  })

  it('selecting always hides all condition extras', () => {
    const initial: Rule = { condition: { kind: 'self_hp_below', pct: 50 }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} />)

    expect(screen.getByLabelText('HP threshold 1')).toBeTruthy()

    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)
    fireEvent.mouseDown(screen.getByRole('option', { name: 'always' }))

    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
  })

  it('selecting a named attack shows action target selector; switching to idle hides it', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} />)

    expect(screen.queryByLabelText('Action target 1')).toBeNull()

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)
    // Quick Jab is the first attack option for vacuum
    const option = screen.getAllByRole('option').find(o => o.textContent?.includes('Quick Jab'))
    expect(option).toBeTruthy()
    fireEvent.mouseDown(option!)

    expect(screen.getByLabelText('Action target 1')).toBeTruthy()

    // Switch back to idle
    fireEvent.focus(screen.getByLabelText('Action 1'))
    fireEvent.mouseDown(screen.getByRole('option', { name: 'idle' }))

    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('only shows chassis-appropriate attacks for vacuum', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} chassis="vacuum" />)

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options.some(o => o.includes('Quick Jab'))).toBe(true)
    expect(options.some(o => o.includes('Sweep'))).toBe(true)
    // Butler/QA-Rig attacks should NOT appear
    expect(options.some(o => o.includes('Taser'))).toBe(false)
    expect(options.some(o => o.includes('Clamp'))).toBe(false)
  })

  it('only shows chassis-appropriate attacks for butler', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} chassis="butler" />)

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options.some(o => o.includes('Taser'))).toBe(true)
    expect(options.some(o => o.includes('Overload'))).toBe(true)
    expect(options.some(o => o.includes('Quick Jab'))).toBe(false)
  })

  it('onChange is called with the correct new rule value', () => {
    const onChange = vi.fn()
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<GambitSlot index={0} rule={initial} onChange={onChange} chassis="vacuum" />)

    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)
    fireEvent.mouseDown(screen.getByRole('option', { name: 'self HP below' }))

    expect(onChange).toHaveBeenCalledWith({
      condition: { kind: 'self_hp_below', pct: 50 },
      action: { kind: 'idle' },
    })
  })
})
