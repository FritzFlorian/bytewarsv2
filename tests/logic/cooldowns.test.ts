import { describe, it, expect } from 'vitest'
import { createCombat, resolveRound } from '../../src/logic/combat/resolver'
import type { Unit } from '../../src/logic/state/types'
import type { GambitList } from '../../src/logic/gambits/types'
import { getAttackDef } from '../../src/logic/content/attackLoader'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  side: 'player' | 'enemy',
  chassis: Unit['chassis'],
  gambits: GambitList,
  hp = 200,
): Unit {
  return {
    id,
    side,
    slot: { side, row: 'front', column: 0 },
    chassis,
    hp,
    maxHp: hp,
    gambits,
  }
}

// ---------------------------------------------------------------------------
// initialCooldown — overload (butler, initialCooldown=1)
// ---------------------------------------------------------------------------

describe('initialCooldown', () => {
  it('overload (initialCooldown=1) is unavailable in round 1, available in round 2', () => {
    // Butler with only overload — should idle round 1, then use overload round 2.
    const player = makeUnit('p1', 'player', 'butler', [
      {
        condition: { kind: 'target_exists', target: 'nearest_enemy' },
        action: { kind: 'overload', target: 'nearest_enemy' },
      },
      { condition: { kind: 'always' }, action: { kind: 'idle' } },
    ])
    // High-HP dummy enemy so combat doesn't end early.
    const enemy = makeUnit(
      'e1',
      'enemy',
      'qa-rig',
      [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
      9999,
    )

    const state = createCombat(42, [player], [enemy])

    // Round 1: overload should be on cooldown (initialCooldown=1), so butler idles.
    const r1 = resolveRound(state)
    const r1Actions = r1.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r1Actions[0]).toMatchObject({ kind: 'action_used', action: { kind: 'idle' } })

    // Round 2: cooldown decremented to 0, overload fires.
    const r2 = resolveRound(r1.state)
    const r2Actions = r2.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r2Actions[0]).toMatchObject({ kind: 'action_used', action: { kind: 'overload' } })
  })
})

// ---------------------------------------------------------------------------
// cooldown — sweep (vacuum, cooldown=2)
// ---------------------------------------------------------------------------

describe('cooldown after use', () => {
  it('sweep (cooldown=2) is unavailable for 2 rounds after use', () => {
    // Vacuum with sweep only (no fallback attack) — after using sweep, should idle for 2 rounds.
    const player = makeUnit('p1', 'player', 'vacuum', [
      {
        condition: { kind: 'target_exists', target: 'nearest_enemy' },
        action: { kind: 'sweep', target: 'nearest_enemy' },
      },
      { condition: { kind: 'always' }, action: { kind: 'idle' } },
    ])
    const enemy = makeUnit(
      'e1',
      'enemy',
      'qa-rig',
      [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
      9999,
    )

    const state = createCombat(42, [player], [enemy])

    // Round 1: sweep fires (no cooldown at start).
    const r1 = resolveRound(state)
    const r1p = r1.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r1p[0]).toMatchObject({ action: { kind: 'sweep' } })

    // Round 2: sweep on cooldown (2 rounds), should idle.
    const r2 = resolveRound(r1.state)
    const r2p = r2.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r2p[0]).toMatchObject({ action: { kind: 'idle' } })

    // Round 3: still on cooldown (1 round remaining), should idle.
    const r3 = resolveRound(r2.state)
    const r3p = r3.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r3p[0]).toMatchObject({ action: { kind: 'idle' } })

    // Round 4: cooldown expired, sweep fires again.
    const r4 = resolveRound(r3.state)
    const r4p = r4.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r4p[0]).toMatchObject({ action: { kind: 'sweep' } })
  })

  it('unit falls through to next rule when preferred attack is on cooldown', () => {
    // Vacuum: try sweep first, fall through to quick_jab when sweep is on cooldown.
    const player = makeUnit('p1', 'player', 'vacuum', [
      {
        condition: { kind: 'target_exists', target: 'nearest_enemy' },
        action: { kind: 'sweep', target: 'nearest_enemy' },
      },
      {
        condition: { kind: 'target_exists', target: 'nearest_enemy' },
        action: { kind: 'quick_jab', target: 'nearest_enemy' },
      },
      { condition: { kind: 'always' }, action: { kind: 'idle' } },
    ])
    const enemy = makeUnit(
      'e1',
      'enemy',
      'qa-rig',
      [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
      9999,
    )

    const state = createCombat(42, [player], [enemy])

    // Round 1: sweep fires.
    const r1 = resolveRound(state)
    const r1p = r1.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r1p[0]).toMatchObject({ action: { kind: 'sweep' } })

    // Round 2: sweep on cooldown, falls through to quick_jab.
    const r2 = resolveRound(r1.state)
    const r2p = r2.events.filter(e => e.kind === 'action_used' && e.unitId === 'p1')
    expect(r2p[0]).toMatchObject({ action: { kind: 'quick_jab' } })
  })
})

// ---------------------------------------------------------------------------
// Damage values match attack definitions
// ---------------------------------------------------------------------------

describe('damage values', () => {
  it('damage dealt matches attack definition', () => {
    const player = makeUnit('p1', 'player', 'vacuum', [
      {
        condition: { kind: 'target_exists', target: 'nearest_enemy' },
        action: { kind: 'quick_jab', target: 'nearest_enemy' },
      },
      { condition: { kind: 'always' }, action: { kind: 'idle' } },
    ])
    const enemy = makeUnit(
      'e1',
      'enemy',
      'qa-rig',
      [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
      9999,
    )

    const state = createCombat(42, [player], [enemy])
    const { events } = resolveRound(state)

    const dmgEvent = events.find(e => e.kind === 'damage_dealt' && e.sourceId === 'p1')
    expect(dmgEvent).toBeDefined()
    if (dmgEvent?.kind === 'damage_dealt') {
      expect(dmgEvent.amount).toBe(getAttackDef('quick_jab').damage) // 8
    }
  })

  it('clamp deals 10 damage', () => {
    const player = makeUnit('p1', 'player', 'qa-rig', [
      {
        condition: { kind: 'target_exists', target: 'nearest_enemy' },
        action: { kind: 'clamp', target: 'nearest_enemy' },
      },
      { condition: { kind: 'always' }, action: { kind: 'idle' } },
    ])
    const enemy = makeUnit(
      'e1',
      'enemy',
      'vacuum',
      [{ condition: { kind: 'always' }, action: { kind: 'idle' } }],
      9999,
    )

    const state = createCombat(42, [player], [enemy])
    const { events } = resolveRound(state)

    const dmgEvent = events.find(e => e.kind === 'damage_dealt' && e.sourceId === 'p1')
    if (dmgEvent?.kind === 'damage_dealt') {
      expect(dmgEvent.amount).toBe(10)
    }
  })
})
