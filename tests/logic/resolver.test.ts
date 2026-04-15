import { describe, it, expect } from 'vitest'
import { walkingSkeletonFixture } from '../../src/logic/content/fixtures'
import { createCombat, resolveRound, isCombatOver } from '../../src/logic/combat/resolver'
import type { CombatEvent } from '../../src/logic/combat/events'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runToCompletion(seed: number): CombatEvent[] {
  const { playerUnits, enemyUnits } = walkingSkeletonFixture()
  let state = createCombat(seed, playerUnits, enemyUnits)
  const allEvents: CombatEvent[] = []
  let guard = 0
  while (!state.finished) {
    if (++guard > 100) throw new Error('combat did not end within 100 rounds')
    const result = resolveRound(state)
    state = result.state
    allEvents.push(...result.events)
  }
  return allEvents
}

// ---------------------------------------------------------------------------
// createCombat
// ---------------------------------------------------------------------------

describe('createCombat', () => {
  it('places all units in the battlefield', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    expect(state.battlefield.slots.size).toBe(4)
  })

  it('starts at round 1 with finished = false', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    expect(state.battlefield.round).toBe(1)
    expect(state.finished).toBe(false)
  })

  it('stores the seed', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(99, playerUnits, enemyUnits)
    expect(state.seed).toBe(99)
  })
})

// ---------------------------------------------------------------------------
// isCombatOver
// ---------------------------------------------------------------------------

describe('isCombatOver', () => {
  it('returns false when both sides have living units', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    expect(isCombatOver(state)).toBe(false)
  })

  it('returns "player" when all enemies are destroyed', () => {
    const { playerUnits } = walkingSkeletonFixture()
    // No enemy units
    const state = createCombat(42, playerUnits, [])
    // Force-finish: slots only has player units — checkWinner should see no enemies
    expect(isCombatOver(state)).toBe('player')
  })

  it('returns "enemy" when all player units are destroyed', () => {
    const { enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, [], enemyUnits)
    expect(isCombatOver(state)).toBe('enemy')
  })
})

// ---------------------------------------------------------------------------
// resolveRound — structural checks
// ---------------------------------------------------------------------------

describe('resolveRound — single round', () => {
  it('emits round_started and round_ended bracketing unit turns', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    const { events } = resolveRound(state)
    expect(events[0]).toEqual({ kind: 'round_started', round: 1 })
    // round_ended is the last event before any combat_ended
    const roundEndedIdx = events.map(e => e.kind).lastIndexOf('round_ended')
    expect(roundEndedIdx).toBeGreaterThan(0)
    const roundEndedEvent = events[roundEndedIdx]
    expect(roundEndedEvent).toEqual({ kind: 'round_ended', round: 1 })
  })

  it('emits turn_started / turn_ended pairs for each living unit', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    const { events } = resolveRound(state)
    const starts = events.filter(e => e.kind === 'turn_started')
    const ends = events.filter(e => e.kind === 'turn_ended')
    expect(starts).toHaveLength(4) // 2 player + 2 enemy
    expect(ends).toHaveLength(4)
    // Every unit that starts a turn also ends it
    const startIds = starts.map(e => (e as { kind: 'turn_started'; unitId: string }).unitId)
    const endIds = ends.map(e => (e as { kind: 'turn_ended'; unitId: string }).unitId)
    expect(startIds).toEqual(endIds)
  })

  it('advances round number by 1', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    const { state: next } = resolveRound(state)
    expect(next.battlefield.round).toBe(2)
  })

  it('interleaves player and enemy turns: p, e, p, e', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    const { events } = resolveRound(state)
    const turnStarts = events
      .filter(e => e.kind === 'turn_started')
      .map(e => (e as { kind: 'turn_started'; unitId: string }).unitId)
    // Fixture: vacuum(player), qa-rig-1(enemy), butler(player), qa-rig-2(enemy)
    expect(turnStarts[0]).toBe('player-vacuum-1')
    expect(turnStarts[1]).toBe('enemy-qa-rig-1')
    expect(turnStarts[2]).toBe('player-butler-1')
    expect(turnStarts[3]).toBe('enemy-qa-rig-2')
  })

  it('does not emit combat_ended mid-fight', () => {
    const { playerUnits, enemyUnits } = walkingSkeletonFixture()
    const state = createCombat(42, playerUnits, enemyUnits)
    const { events } = resolveRound(state)
    expect(events.some(e => e.kind === 'combat_ended')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Golden test — full fight with pinned seed
//
// Fight trace (seed=42, v0.5 named attacks + cooldowns):
//   Fixture: vacuum (sweep 18dmg cd2 / quick_jab 8dmg) vs qa-rig×2 (clamp 15dmg cd1)
//            butler (overload 30dmg init-cd1 cd3 / taser 7dmg) — overload avail from round 2
//
//   Damage values (no ATTACK_DAMAGE constant):
//     vacuum  : sweep=18, quick_jab=8
//     butler  : taser=7, overload=30 (cd1 initial → avail round 2)
//     qa-rig  : clamp=15 (cd1 → avail every other round)
//
//   Result: player wins after 7 rounds, 134 events total.
// ---------------------------------------------------------------------------

describe('golden test — walking-skeleton fixture, seed 42', () => {
  const events = runToCompletion(42)

  it('produces exactly 134 events', () => {
    expect(events).toHaveLength(134)
  })

  it('ends with combat_ended winner=player', () => {
    expect(events[events.length - 1]).toEqual({ kind: 'combat_ended', winner: 'player' })
  })

  it('runs exactly 7 rounds', () => {
    const roundEnds = events.filter(e => e.kind === 'round_ended')
    expect(roundEnds).toHaveLength(7)
  })

  it('destroys exactly 3 units in the correct order', () => {
    const destroyed = events
      .filter(e => e.kind === 'unit_destroyed')
      .map(e => (e as { kind: 'unit_destroyed'; unitId: string }).unitId)
    expect(destroyed).toEqual(['enemy-qa-rig-1', 'player-vacuum-1', 'enemy-qa-rig-2'])
  })

  it('enemy-qa-rig-1 is destroyed in round 4', () => {
    const firstDestroyIdx = events.findIndex(e => e.kind === 'unit_destroyed')
    const lastRoundStart = events
      .slice(0, firstDestroyIdx)
      .filter(e => e.kind === 'round_started')
      .pop() as { kind: 'round_started'; round: number }
    expect(lastRoundStart.round).toBe(4)
  })

  it('player-vacuum-1 is destroyed in round 7', () => {
    const destroyEvents = events.filter(e => e.kind === 'unit_destroyed')
    const vacuumDestroyIdx = events.indexOf(destroyEvents[1])
    const lastRoundStart = events
      .slice(0, vacuumDestroyIdx)
      .filter(e => e.kind === 'round_started')
      .pop() as { kind: 'round_started'; round: number }
    expect(lastRoundStart.round).toBe(7)
  })

  it('is deterministic — same seed produces identical events', () => {
    const events2 = runToCompletion(42)
    expect(events2).toEqual(events)
  })

  it('different seeds produce the same result (no RNG variance in this fixture)', () => {
    const eventsOtherSeed = runToCompletion(999)
    expect(eventsOtherSeed).toHaveLength(events.length)
    expect(eventsOtherSeed[eventsOtherSeed.length - 1]).toEqual({
      kind: 'combat_ended',
      winner: 'player',
    })
  })

  it('combat_ended always emitted within 100 rounds regardless of seed', () => {
    expect(() => runToCompletion(1)).not.toThrow()
    expect(() => runToCompletion(12345)).not.toThrow()
  })
})
