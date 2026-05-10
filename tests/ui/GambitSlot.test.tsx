// @vitest-environment jsdom
//
// GambitSlot unit tests — updated for v0.7 module system (T-7.14):
//   - condition=self_hp_below shows pct input
//   - condition=target_exists shows condition target selector
//   - condition=always shows neither
//   - action=idle hides action target selector
//   - action=module shows action target selector
//   - Attack modules show enemy target options; heal modules show ally targets
//   - Action picker lists only installed active modules (not chassis-filtered)
//   - Selecting a new condition via the dropdown fires onChange with the correct rule

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { useState } from 'react'
import { GambitSlot } from '../../src/ui/screens/GambitEditor/GambitSlot'
import type { Rule, ActiveModuleDef } from '../../src/logic'

afterEach(() => cleanup())

// Sample active module defs for testing
const QUICK_JAB: ActiveModuleDef = {
  id: 'quick_jab',
  name: 'Quick Jab',
  type: 'active',
  availability: 'both',
  rarity: 1,
  actionKind: 'attack',
  attackProperties: { damage: 8, cooldown: 0, initialCooldown: 0 },
  sound: 'quick_jab',
}

const SWEEP: ActiveModuleDef = {
  id: 'sweep',
  name: 'Sweep',
  type: 'active',
  availability: 'both',
  rarity: 2,
  actionKind: 'attack',
  attackProperties: { damage: 18, cooldown: 2, initialCooldown: 0 },
  sound: 'sweep',
}

const PATCH_KIT: ActiveModuleDef = {
  id: 'patch_kit',
  name: 'Patch Kit',
  type: 'active',
  availability: 'player',
  rarity: 2,
  actionKind: 'heal',
  healProperties: { healAmount: 15, cooldown: 2, initialCooldown: 0 },
  sound: 'patch_kit',
}

const OVERLOAD: ActiveModuleDef = {
  id: 'overload',
  name: 'Overload',
  type: 'active',
  availability: 'both',
  rarity: 3,
  actionKind: 'attack',
  attackProperties: { damage: 30, cooldown: 3, initialCooldown: 1 },
  sound: 'overload',
}

const ATTACK_MODULES = [QUICK_JAB, SWEEP]
const MIXED_MODULES = [QUICK_JAB, PATCH_KIT]

// ---------------------------------------------------------------------------
// Rendering based on rule prop — no interaction needed
// ---------------------------------------------------------------------------

describe('GambitSlot — conditional field visibility', () => {
  it('always + idle: no pct, no target selectors', () => {
    const rule: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(
      <GambitSlot index={0} rule={rule} onChange={() => {}} activeModuleDefs={ATTACK_MODULES} />,
    )
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('self_hp_below + idle: shows pct input, no target selectors', () => {
    const rule: Rule = { condition: { kind: 'self_hp_below', pct: 50 }, action: { kind: 'idle' } }
    render(
      <GambitSlot index={0} rule={rule} onChange={() => {}} activeModuleDefs={ATTACK_MODULES} />,
    )
    expect(screen.getByLabelText('HP threshold 1')).toBeTruthy()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('target_exists + idle: shows condition target selector, no pct', () => {
    const rule: Rule = {
      condition: { kind: 'target_exists', target: 'nearest_enemy' },
      action: { kind: 'idle' },
    }
    render(
      <GambitSlot index={0} rule={rule} onChange={() => {}} activeModuleDefs={ATTACK_MODULES} />,
    )
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.getByLabelText('Condition target 1')).toBeTruthy()
    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('always + named attack: shows action target selector, no condition extras', () => {
    const rule: Rule = {
      condition: { kind: 'always' },
      action: { kind: 'quick_jab', target: 'nearest_enemy' },
    }
    render(
      <GambitSlot index={0} rule={rule} onChange={() => {}} activeModuleDefs={ATTACK_MODULES} />,
    )
    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
    expect(screen.getByLabelText('Action target 1')).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Interaction — stateful wrapper so the slot reflects prop changes
// ---------------------------------------------------------------------------

function SlotWrapper({
  initialRule,
  activeModuleDefs = ATTACK_MODULES,
}: {
  initialRule: Rule
  activeModuleDefs?: ActiveModuleDef[]
}) {
  const [rule, setRule] = useState(initialRule)
  return <GambitSlot index={0} rule={rule} onChange={setRule} activeModuleDefs={activeModuleDefs} />
}

describe('GambitSlot — interaction', () => {
  it('selecting self_hp_below from the condition dropdown shows the pct input', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} />)

    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)

    const option = screen.getByRole('option', { name: 'self HP below' })
    fireEvent.mouseDown(option)

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
    const initial: Rule = {
      condition: { kind: 'self_hp_below', pct: 50 },
      action: { kind: 'idle' },
    }
    render(<SlotWrapper initialRule={initial} />)

    expect(screen.getByLabelText('HP threshold 1')).toBeTruthy()

    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)
    fireEvent.mouseDown(screen.getByRole('option', { name: 'always' }))

    expect(screen.queryByLabelText('HP threshold 1')).toBeNull()
    expect(screen.queryByLabelText('Condition target 1')).toBeNull()
  })

  it('selecting an attack module shows action target selector; switching to idle hides it', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} />)

    expect(screen.queryByLabelText('Action target 1')).toBeNull()

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)
    const option = screen.getAllByRole('option').find(o => o.textContent?.includes('Quick Jab'))
    expect(option).toBeTruthy()
    fireEvent.mouseDown(option!)

    expect(screen.getByLabelText('Action target 1')).toBeTruthy()

    // Switch back to idle
    fireEvent.focus(screen.getByLabelText('Action 1'))
    fireEvent.mouseDown(screen.getByRole('option', { name: 'idle' }))

    expect(screen.queryByLabelText('Action target 1')).toBeNull()
  })

  it('action picker shows only installed active modules', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} activeModuleDefs={[QUICK_JAB, OVERLOAD]} />)

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options.some(o => o.includes('Quick Jab'))).toBe(true)
    expect(options.some(o => o.includes('Overload'))).toBe(true)
    expect(options.some(o => o.includes('Sweep'))).toBe(false)
    expect(options.some(o => o.includes('idle'))).toBe(true)
  })

  it('attack module shows damage and cooldown info in dropdown', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} activeModuleDefs={[SWEEP, OVERLOAD]} />)

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options.some(o => o.includes('18 dmg') && o.includes('2-round cd'))).toBe(true)
    expect(options.some(o => o.includes('30 dmg') && o.includes('unavail. round 1'))).toBe(true)
  })

  it('heal module shows heal amount in dropdown', () => {
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(<SlotWrapper initialRule={initial} activeModuleDefs={MIXED_MODULES} />)

    const actionInput = screen.getByLabelText('Action 1')
    fireEvent.focus(actionInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options.some(o => o.includes('Patch Kit') && o.includes('15 heal'))).toBe(true)
  })

  it('attack modules show enemy target selectors', () => {
    const initial: Rule = {
      condition: { kind: 'always' },
      action: { kind: 'quick_jab', target: 'nearest_enemy' },
    }
    render(<SlotWrapper initialRule={initial} activeModuleDefs={ATTACK_MODULES} />)

    const targetInput = screen.getByLabelText('Action target 1')
    fireEvent.focus(targetInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options).toContain('nearest enemy')
    expect(options).toContain('any enemy')
    expect(options).not.toContain('any ally')
    expect(options).not.toContain('weakest ally')
  })

  it('heal modules show ally target selectors', () => {
    const initial: Rule = {
      condition: { kind: 'always' },
      action: { kind: 'patch_kit', target: 'any_ally' },
    }
    render(<SlotWrapper initialRule={initial} activeModuleDefs={MIXED_MODULES} />)

    const targetInput = screen.getByLabelText('Action target 1')
    fireEvent.focus(targetInput)

    const options = screen.getAllByRole('option').map(o => o.textContent ?? '')
    expect(options).toContain('any ally')
    expect(options).toContain('weakest ally')
    expect(options).toContain('self')
    expect(options).not.toContain('nearest enemy')
  })

  it('onChange is called with the correct new rule value', () => {
    const onChange = vi.fn()
    const initial: Rule = { condition: { kind: 'always' }, action: { kind: 'idle' } }
    render(
      <GambitSlot index={0} rule={initial} onChange={onChange} activeModuleDefs={ATTACK_MODULES} />,
    )

    const conditionInput = screen.getByLabelText('Condition 1')
    fireEvent.focus(conditionInput)
    fireEvent.mouseDown(screen.getByRole('option', { name: 'self HP below' }))

    expect(onChange).toHaveBeenCalledWith({
      condition: { kind: 'self_hp_below', pct: 50 },
      action: { kind: 'idle' },
    })
  })
})
