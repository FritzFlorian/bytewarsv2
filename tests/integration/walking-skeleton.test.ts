// @vitest-environment jsdom
//
// Walking-skeleton integration test — T-3.2.
//
// Two levels of coverage:
//   1. Logic level: the full combat run (createCombat → loop resolveRound)
//      produces a combat_ended event with a winner.
//   2. UI level: rendering <App />, navigating editor → Run → Start Combat,
//      and asserting that the combat scene loads with events ready for playback.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import React from 'react'
import App from '../../src/ui/App'
import {
  createCombat,
  resolveRound,
  isCombatOver,
  walkingSkeletonFixture,
} from '../../src/logic'
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
// UI level: App → GambitEditorScreen → Run → CombatScreen → Start Combat
// ---------------------------------------------------------------------------

describe('walking skeleton — UI integration', () => {
  it('Run navigates to combat screen; Start Combat loads the scene with events', async () => {
    await act(async () => { render(React.createElement(App)) })

    // Landing page is the gambit editor — Run button is visible and enabled
    const runBtn = screen.getByRole('button', { name: 'Run' })
    expect((runBtn as HTMLButtonElement).disabled).toBe(false)

    // Navigate to the combat screen
    await act(async () => { fireEvent.click(runBtn) })

    // Start Combat button is now visible
    const startBtn = screen.getByRole('button', { name: 'Start Combat' })
    expect((startBtn as HTMLButtonElement).disabled).toBe(false)

    // Run the combat
    await act(async () => { fireEvent.click(startBtn) })

    // Button is disabled once combat data is loaded
    expect((startBtn as HTMLButtonElement).disabled).toBe(true)

    // CombatScene progress counter is visible: "0 / N events"
    // This proves the event log was built and passed to the scene.
    const progress = screen.getByText(/\d+ \/ \d+ events/)
    expect(progress).not.toBeNull()

    // The play button is present (playback starts paused)
    const playBtn = screen.getByRole('button', { name: 'Play' })
    expect(playBtn).not.toBeNull()
  })
})
