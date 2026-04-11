// Tests for applyBattleResult (T-4.3).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { createRunState, selectNode, getReachableNodes } from '../../src/logic/map/navigation'
import { applyBattleResult } from '../../src/logic/map/progression'
import type { RunState, BattleResult } from '../../src/logic/map/types'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Builds a minimal RunState with two player units (ids: 'u1', 'u2'). */
function makeRun(overrides?: Partial<RunState>): RunState {
  const map = generateMap(createRng(42))
  const base = createRunState(map, [
    {
      id: 'u1',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 0 },
      chassis: 'vacuum',
      hp: 80,
      maxHp: 80,
      gambits: [],
    },
    {
      id: 'u2',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 1 },
      chassis: 'butler',
      hp: 60,
      maxHp: 80,
      gambits: [],
    },
  ])

  // Advance to the first combat node.
  const col0 = getReachableNodes(base)
  const atNode = selectNode(base, col0[0].id)

  return { ...atNode, ...overrides }
}

// ── HP carry-over ──────────────────────────────────────────────────────────

describe('applyBattleResult — HP carry-over', () => {
  it('updates surviving unit HP in the snapshot', () => {
    const run = makeRun()
    const result: BattleResult = {
      winner: 'player',
      survivingHp: { u1: 45, u2: 30 },
    }

    const next = applyBattleResult(run, result)
    expect(next.hpSnapshot['u1']).toBe(45)
    expect(next.hpSnapshot['u2']).toBe(30)
  })

  it('keeps status active after a player win on a non-boss node', () => {
    const run = makeRun()
    const result: BattleResult = { winner: 'player', survivingHp: { u1: 40, u2: 40 } }
    const next = applyBattleResult(run, result)
    expect(next.status).toBe('active')
  })
})

// ── Dead-unit → sitting out ────────────────────────────────────────────────

describe('applyBattleResult — sitting-out mechanics', () => {
  it('moves a unit that died (hp = 0) into sittingOut', () => {
    const run = makeRun()
    const result: BattleResult = {
      winner: 'player',
      survivingHp: { u1: 50, u2: 0 },
    }

    const next = applyBattleResult(run, result)
    expect(next.sittingOut.has('u2')).toBe(true)
    expect(next.sittingOut.has('u1')).toBe(false)
  })

  it('unit absent in fight N+1 (it is in sittingOut)', () => {
    const run = makeRun()

    // Fight N: u2 dies
    const result1: BattleResult = { winner: 'player', survivingHp: { u1: 50, u2: 0 } }
    const runAfterN = applyBattleResult(run, result1)
    expect(runAfterN.sittingOut.has('u2')).toBe(true)
  })

  it('unit returns at 42% max HP in fight N+2', () => {
    const run = makeRun()

    // Fight N: u2 dies
    const result1: BattleResult = { winner: 'player', survivingHp: { u1: 50, u2: 0 } }
    const runAfterN = applyBattleResult(run, result1)

    // Fight N+1: u2 is sitting out; u1 survives
    const result2: BattleResult = { winner: 'player', survivingHp: { u1: 40 } }
    const runAfterN1 = applyBattleResult(runAfterN, result2)

    // u2 should be revived at 42% of maxHp=80 → ceil(80 * 0.42) = 34
    expect(runAfterN1.sittingOut.has('u2')).toBe(false)
    expect(runAfterN1.hpSnapshot['u2']).toBe(Math.ceil(80 * 0.42))
  })

  it('revived unit HP is exactly ceil(maxHp * 0.42)', () => {
    expect(Math.ceil(80 * 0.42)).toBe(34)
    const run = makeRun()
    const result1: BattleResult = { winner: 'player', survivingHp: { u1: 50, u2: 0 } }
    const runAfterN = applyBattleResult(run, result1)
    const result2: BattleResult = { winner: 'player', survivingHp: { u1: 40 } }
    const runAfterN1 = applyBattleResult(runAfterN, result2)
    expect(runAfterN1.hpSnapshot['u2']).toBe(34)
  })
})

// ── Status transitions ─────────────────────────────────────────────────────

describe('applyBattleResult — run status', () => {
  it('sets status to "lost" when enemy wins', () => {
    const run = makeRun()
    const result: BattleResult = { winner: 'enemy', survivingHp: {} }
    const next = applyBattleResult(run, result)
    expect(next.status).toBe('lost')
  })

  it('sets status to "won" when player beats the boss node', () => {
    // Build a run at the boss node.
    const map = generateMap(createRng(42))
    const base = createRunState(map, [
      {
        id: 'u1',
        side: 'player',
        slot: { side: 'player', row: 'front', column: 0 },
        chassis: 'vacuum',
        hp: 80,
        maxHp: 80,
        gambits: [],
      },
    ])
    const bossNode = map.nodes.find(n => n.type === 'boss')!
    const atBoss: RunState = { ...base, currentNodeId: bossNode.id }

    const result: BattleResult = { winner: 'player', survivingHp: { u1: 20 } }
    const next = applyBattleResult(atBoss, result)
    expect(next.status).toBe('won')
  })

  it('does not set status to "won" when winning a non-boss fight', () => {
    const run = makeRun() // currentNodeId is a combat node
    const result: BattleResult = { winner: 'player', survivingHp: { u1: 60, u2: 60 } }
    const next = applyBattleResult(run, result)
    expect(next.status).toBe('active')
  })

  it('sets status to "lost" on a full wipe', () => {
    const run = makeRun()
    const result: BattleResult = { winner: 'enemy', survivingHp: { u1: 0, u2: 0 } }
    const next = applyBattleResult(run, result)
    expect(next.status).toBe('lost')
  })
})
