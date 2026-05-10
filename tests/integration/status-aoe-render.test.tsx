// @vitest-environment jsdom
//
// Integration test for v0.8 render additions (T-8.4):
//   - Status badge appears on a unit after a status_applied event.
//   - AoE side flash class is applied during a multi-target action.
//   - Per-target damage popups land on each AoE target.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import React from 'react'
import { CombatScene } from '../../src/render/CombatScene'
import type { UnitInfo } from '../../src/render/CombatScene'
import type { CombatEvent } from '../../src/logic'

afterEach(() => cleanup())

function unit(
  id: string,
  side: 'player' | 'enemy',
  row: 'front' | 'middle' | 'back',
  column: 0 | 1 | 2,
  hp: number,
): UnitInfo {
  return {
    id,
    side,
    slot: { side, row, column },
    hp,
    maxHp: hp,
    chassis: side === 'player' ? 'vacuum' : 'qa-rig',
  }
}

describe('status badge rendering (T-8.4)', () => {
  it('renders a badge after status_applied is played back', async () => {
    const units: UnitInfo[] = [
      unit('p1', 'player', 'front', 0, 70),
      unit('e1', 'enemy', 'front', 0, 50),
    ]
    const events: CombatEvent[] = [
      { kind: 'round_started', round: 1 },
      { kind: 'turn_started', unitId: 'p1' },
      { kind: 'rule_fired', unitId: 'p1', ruleIndex: 0 },
      {
        kind: 'action_used',
        unitId: 'p1',
        action: { kind: 'taser', target: 'nearest_enemy' },
        targets: ['e1'],
      },
      {
        kind: 'status_applied',
        sourceId: 'p1',
        targetId: 'e1',
        statusKind: 'burning',
        magnitude: 3,
        duration: 2,
      },
      { kind: 'turn_ended', unitId: 'p1' },
      { kind: 'round_ended', round: 1 },
    ]

    const { container } = render(
      React.createElement(CombatScene, { units, events, speed: 10, autoPlay: true }),
    )

    // Wait for playback to drain (10× speed at ~1.5s total = well under 1s).
    await act(async () => {
      await new Promise(r => setTimeout(r, 1500))
    })

    const badge = container.querySelector('[data-status-kind="burning"]')
    expect(badge).not.toBeNull()
  })
})

describe('AoE flash (T-8.4)', () => {
  it('applies the aoe-flash class to the enemy side when an AoE action fires', async () => {
    const units: UnitInfo[] = [
      unit('p1', 'player', 'front', 0, 70),
      unit('e1', 'enemy', 'front', 0, 50),
      unit('e2', 'enemy', 'front', 1, 50),
    ]
    // Note: we intentionally omit turn_ended so the AoE flash state persists
    // through the end of playback — making the assertion timing-independent.
    const events: CombatEvent[] = [
      { kind: 'round_started', round: 1 },
      { kind: 'turn_started', unitId: 'p1' },
      { kind: 'rule_fired', unitId: 'p1', ruleIndex: 0 },
      {
        kind: 'action_used',
        unitId: 'p1',
        action: { kind: 'sweep', target: 'all_enemies' },
        targets: ['e1', 'e2'],
      },
      { kind: 'damage_dealt', sourceId: 'p1', targetId: 'e1', amount: 6 },
      { kind: 'damage_dealt', sourceId: 'p1', targetId: 'e2', amount: 6 },
    ]

    const { container } = render(
      React.createElement(CombatScene, { units, events, speed: 10, autoPlay: true }),
    )

    await act(async () => {
      await new Promise(r => setTimeout(r, 1000))
    })

    const flashed = container.querySelector('[data-aoe-flash="true"]')
    expect(flashed).not.toBeNull()
  })

  it('per-target damage is applied to both AoE targets', async () => {
    const units: UnitInfo[] = [
      unit('p1', 'player', 'front', 0, 70),
      unit('e1', 'enemy', 'front', 0, 50),
      unit('e2', 'enemy', 'front', 1, 50),
    ]
    const events: CombatEvent[] = [
      { kind: 'round_started', round: 1 },
      { kind: 'turn_started', unitId: 'p1' },
      { kind: 'rule_fired', unitId: 'p1', ruleIndex: 0 },
      {
        kind: 'action_used',
        unitId: 'p1',
        action: { kind: 'sweep', target: 'all_enemies' },
        targets: ['e1', 'e2'],
      },
      { kind: 'damage_dealt', sourceId: 'p1', targetId: 'e1', amount: 25 },
      { kind: 'damage_dealt', sourceId: 'p1', targetId: 'e2', amount: 25 },
      { kind: 'turn_ended', unitId: 'p1' },
      { kind: 'round_ended', round: 1 },
    ]

    const { container } = render(
      React.createElement(CombatScene, { units, events, speed: 10, autoPlay: true }),
    )

    await act(async () => {
      await new Promise(r => setTimeout(r, 1500))
    })

    // HP bars are inline-styled with width="<pct>%". Each enemy took 25 of 50 = 50%.
    const e1Slot = container.querySelector('[data-unit-id="e1"]')
    const e2Slot = container.querySelector('[data-unit-id="e2"]')
    expect(e1Slot).not.toBeNull()
    expect(e2Slot).not.toBeNull()
    const e1Fill = e1Slot?.querySelector('[class*="hpFill"]') as HTMLElement | null
    const e2Fill = e2Slot?.querySelector('[class*="hpFill"]') as HTMLElement | null
    expect(e1Fill?.style.width).toBe('50%')
    expect(e2Fill?.style.width).toBe('50%')
  })
})
