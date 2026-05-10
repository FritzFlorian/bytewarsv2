// @vitest-environment jsdom
//
// v0.8 ship-gate integration test (T-8.8):
// Build a combat where a player uses a buff/debuff and an AoE attack, run it
// through the real resolver, render the resulting events with <CombatScene>,
// and assert that:
//   - a status badge appears on a unit after status_applied playback
//   - the AoE side flash is applied during a multi-target action
//   - damage_dealt fires per AoE target (logic-side assertion)
//
// This complements the e2e full-run.spec.ts by exercising v0.8 features on a
// deterministic squad — far more reliable than seed-pinning the unseeded run.

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import React from 'react'
import { UnitInstance } from '../../src/logic/state/UnitInstance'
import { createCombat, resolveRound } from '../../src/logic/combat/resolver'
import type { GambitList } from '../../src/logic/gambits/types'
import { CombatScene } from '../../src/render/CombatScene'
import type { UnitInfo } from '../../src/render/CombatScene'

afterEach(() => cleanup())

function makePlayer(
  id: string,
  activeModuleIds: string[],
  gambits: GambitList,
  row: 'front' | 'middle' | 'back',
  column: 0 | 1 | 2,
): UnitInstance {
  return new UnitInstance(
    id,
    'player',
    { side: 'player', row, column },
    'vacuum',
    70,
    activeModuleIds.map(defId => ({ defId, cooldownRemaining: 0 })),
    [],
    gambits,
  )
}

function makeEnemy(id: string, row: 'front' | 'middle' | 'back', column: 0 | 1 | 2): UnitInstance {
  return new UnitInstance(
    id,
    'enemy',
    { side: 'enemy', row, column },
    'qa-rig',
    50,
    [{ defId: 'quick_jab', cooldownRemaining: 0 }],
    [],
    [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
  )
}

function unitInfo(u: UnitInstance): UnitInfo {
  return { id: u.id, side: u.side, slot: u.slot, hp: u.hp, maxHp: u.maxHp, chassis: u.chassis }
}

describe('v0.8 ship gate — buff + AoE round-trip through render', () => {
  it('a debuff (jam_signal) applies disabled and shows the status badge', async () => {
    const player = makePlayer(
      'p1',
      ['jam_signal'],
      [
        {
          condition: { kind: 'target_exists', target: 'nearest_enemy' },
          action: { kind: 'jam_signal', target: 'nearest_enemy' },
        },
        { condition: { kind: 'always' }, action: { kind: 'idle' } },
      ],
      'front',
      0,
    )
    const enemy = makeEnemy('e1', 'front', 0)

    const state = createCombat(42, [player], [enemy])
    const { events } = resolveRound(state)

    // Logic-layer assertion
    const applied = events.find(e => e.kind === 'status_applied' && e.statusKind === 'disabled')
    expect(applied).toBeDefined()

    // Truncate events to stop at status_applied so the badge stays visible at
    // the end of playback (the enemy's end-of-turn tick would otherwise expire
    // a 1-round disable immediately).
    const applyIdx = events.findIndex(
      e => e.kind === 'status_applied' && e.statusKind === 'disabled',
    )
    const truncated = events.slice(0, applyIdx + 1)

    const units: UnitInfo[] = [unitInfo(player), unitInfo(enemy)]
    const { container } = render(
      React.createElement(CombatScene, { units, events: truncated, speed: 10, autoPlay: true }),
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 1500))
    })

    const badge = container.querySelector('[data-status-kind="disabled"]')
    expect(badge).not.toBeNull()
  })

  it('an AoE attack hits every enemy and triggers the AoE flash class', async () => {
    // Player with concussion (all_enemies). concussion has initialCooldown=1
    // so it fires on round 2 — we drive 2 rounds through the resolver.
    const playerInitial = makePlayer(
      'p1',
      ['concussion', 'quick_jab'],
      [
        {
          condition: { kind: 'target_exists', target: 'nearest_enemy' },
          action: { kind: 'concussion', target: 'all_enemies' },
        },
        { condition: { kind: 'always' }, action: { kind: 'idle' } },
      ],
      'front',
      0,
    )
    const e1 = makeEnemy('e1', 'front', 0)
    const e2 = makeEnemy('e2', 'front', 1)

    let state = createCombat(42, [playerInitial], [e1, e2])
    const events1 = resolveRound(state)
    state = events1.state
    const events2 = resolveRound(state)
    const events = [...events1.events, ...events2.events]

    // Concussion fires in round 2 (initialCooldown=1). action_used should have 2 targets.
    const aoeAction = events.find(
      e => e.kind === 'action_used' && e.unitId === 'p1' && e.targets.length === 2,
    )
    expect(aoeAction).toBeDefined()

    // Two damage_dealt events from p1 in that round
    const dmg = events.filter(e => e.kind === 'damage_dealt' && e.sourceId === 'p1')
    expect(dmg.length).toBeGreaterThanOrEqual(2)

    // Render — verify the AoE flash class shows up on the enemy side at the
    // moment the AoE action is in flight.
    const units: UnitInfo[] = [unitInfo(playerInitial), unitInfo(e1), unitInfo(e2)]
    // Build a truncated event stream that stops after the AoE damage but before turn_ended,
    // so the deriveCurrentAoe stays set and the flash class persists.
    const aoeIdx = events.findIndex(
      e => e.kind === 'action_used' && e.unitId === 'p1' && e.targets.length === 2,
    )
    const truncated = events.slice(0, aoeIdx + 3)
    const { container } = render(
      React.createElement(CombatScene, { units, events: truncated, speed: 10, autoPlay: true }),
    )
    await act(async () => {
      await new Promise(r => setTimeout(r, 1000))
    })

    const flashed = container.querySelector('[data-aoe-flash="true"]')
    expect(flashed).not.toBeNull()
  })
})
