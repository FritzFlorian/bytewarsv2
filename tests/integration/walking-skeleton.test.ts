// @vitest-environment jsdom
//
// Walking-skeleton integration test — updated for v0.4 run flow.
//
// Two levels of coverage:
//   1. Logic level: the full combat run (createCombat → loop resolveRound)
//      produces a combat_ended event with a winner.
//   2. UI level: rendering <App />, navigating the map → gambit editor →
//      combat screen, asserting that the combat scene loads with events ready.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import React from 'react'
import App from '../../src/ui/App'
import { createCombat, resolveRound, isCombatOver, walkingSkeletonFixture } from '../../src/logic'
import type { CombatEvent } from '../../src/logic'

afterEach(() => cleanup())

// ---------------------------------------------------------------------------
// Logic level: the resolver must produce a combat_ended event
// ---------------------------------------------------------------------------

describe('walking skeleton — logic', () => {
  it('full run (seed 42) produces a combat_ended event with a winner', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    let state = createCombat(42, playerUnits, enemyUnits)
    const events: CombatEvent[] = []

    let guard = 0
    while (!isCombatOver(state)) {
      if (++guard > 100) throw new Error('combat did not end within 100 rounds')
      const result = resolveRound(state)
      events.push(...result.events)
      state = result.state
    }

    const ended = events.find(e => e.kind === 'combat_ended')
    expect(ended).toBeDefined()

    if (ended?.kind === 'combat_ended') {
      expect(['player', 'enemy']).toContain(ended.winner)
    }
  })
})

// ---------------------------------------------------------------------------
// UI level: App → MapScreen → GambitEditorScreen → Run → CombatScreen
// ---------------------------------------------------------------------------

describe('walking skeleton — UI integration', () => {
  it('map → gambit editor → Run → combat scene loads with events', async () => {
    await act(async () => {
      render(React.createElement(App))
    })

    // Landing page is now the map screen — find a reachable combat node (icon ⚔).
    const nodeButtons = screen.getAllByRole('button', { name: '⚔' })
    const reachableNode = nodeButtons.find(btn => !(btn as HTMLButtonElement).disabled)
    expect(reachableNode).toBeDefined()

    // Click a reachable node → transition to gambit editor.
    await act(async () => {
      fireEvent.click(reachableNode!)
    })

    // Gambit editor is now visible with a Run button.
    const runBtn = screen.getByRole('button', { name: 'Run' })
    expect((runBtn as HTMLButtonElement).disabled).toBe(false)

    // Click Run — App resolves the fight and transitions to CombatScreen.
    await act(async () => {
      fireEvent.click(runBtn)
    })

    // CombatScene progress counter is visible: "0 / N events"
    const progress = screen.getByText(/\d+ \/ \d+ events/)
    expect(progress).not.toBeNull()

    // autoPlay fired — button shows Pause (not Play)
    const pauseBtn = screen.getByRole('button', { name: 'Pause' })
    expect(pauseBtn).not.toBeNull()
  })
})
