import { describe, it, expect } from 'vitest'
import { chooseAction } from '../../src/logic/gambits/interpreter'
import type { Unit, Battlefield, SlotMap } from '../../src/logic/state/types'
import { slotKey } from '../../src/logic/state/types'
import type { GambitList } from '../../src/logic/gambits/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  side: 'player' | 'enemy',
  row: 'front' | 'middle' | 'back',
  column: 0 | 1 | 2,
  hp: number,
  maxHp: number,
  gambits: GambitList,
): Unit {
  return { id, side, slot: { side, row, column }, chassis: 'vacuum', hp, maxHp, gambits }
}

function makeBattlefield(...units: Unit[]): Battlefield {
  const slots: SlotMap = new Map()
  for (const unit of units) {
    slots.set(slotKey(unit.slot), unit)
  }
  return { slots, round: 1 }
}

// A player unit used as the subject of most tests.
const PLAYER = makeUnit('p1', 'player', 'front', 0, 80, 80, [])

// Enemy units at different rows and columns.
const ENEMY_FRONT_0 = makeUnit('e1', 'enemy', 'front', 0, 60, 60, [])
const ENEMY_FRONT_1 = makeUnit('e2', 'enemy', 'front', 1, 60, 60, [])
const ENEMY_BACK_0  = makeUnit('e3', 'enemy', 'back',  0, 60, 60, [])

// ---------------------------------------------------------------------------
// Condition: always
// ---------------------------------------------------------------------------

describe('condition: always', () => {
  it('fires regardless of battlefield state', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'always' as const }, action: { kind: 'idle' as const } },
    ] }
    const bf = makeBattlefield(unit)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })

  it('fires even when no enemies exist', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'always' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit) // no enemies
    expect(chooseAction(unit, bf)).toEqual({ kind: 'attack', target: 'nearest_enemy' })
  })
})

// ---------------------------------------------------------------------------
// Condition: self_hp_below
// ---------------------------------------------------------------------------

describe('condition: self_hp_below', () => {
  it('fires when unit HP is strictly below the threshold', () => {
    const unit = { ...PLAYER, hp: 39, maxHp: 80, gambits: [
      { condition: { kind: 'self_hp_below' as const, pct: 50 }, action: { kind: 'attack' as const, target: 'any_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'attack', target: 'any_enemy' })
  })

  it('does NOT fire when unit HP is exactly at the threshold', () => {
    // 40/80 = 50% — not strictly below 50
    const unit = { ...PLAYER, hp: 40, maxHp: 80, gambits: [
      { condition: { kind: 'self_hp_below' as const, pct: 50 }, action: { kind: 'attack' as const, target: 'any_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })

  it('does NOT fire when unit HP is above the threshold', () => {
    const unit = { ...PLAYER, hp: 80, maxHp: 80, gambits: [
      { condition: { kind: 'self_hp_below' as const, pct: 50 }, action: { kind: 'idle' as const } },
    ] }
    const bf = makeBattlefield(unit)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
    // Distinguish: did 'idle' fire from this rule or from fall-through?
    // Use a different action to be sure it came from the rule.
    const unit2 = { ...PLAYER, hp: 80, maxHp: 80, gambits: [
      { condition: { kind: 'self_hp_below' as const, pct: 50 }, action: { kind: 'attack' as const, target: 'any_enemy' as const } },
    ] }
    const bf2 = makeBattlefield(unit2)
    // Should fall through to idle since no rule matches
    expect(chooseAction(unit2, bf2)).toEqual({ kind: 'idle' })
  })
})

// ---------------------------------------------------------------------------
// Condition: target_exists  (also tests target selectors)
// ---------------------------------------------------------------------------

describe('condition: target_exists — self selector', () => {
  it('always fires because the unit itself always exists', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'target_exists' as const, target: 'self' as const }, action: { kind: 'idle' as const } },
    ] }
    const bf = makeBattlefield(unit)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })
})

describe('condition: target_exists — nearest_enemy selector', () => {
  it('fires when at least one enemy is on the battlefield', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'target_exists' as const, target: 'nearest_enemy' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'attack', target: 'nearest_enemy' })
  })

  it('does NOT fire when no enemies exist', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'target_exists' as const, target: 'nearest_enemy' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit) // no enemies
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })

  it('resolves nearest_enemy as the front-row unit when enemies are in multiple rows', () => {
    // Both ENEMY_FRONT_0 (front) and ENEMY_BACK_0 (back) are on the field.
    // target_exists with nearest_enemy should see at least one enemy → rule fires.
    // (The actual unit attacked is determined by the resolver in T-2A.3, not here.)
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'target_exists' as const, target: 'nearest_enemy' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0, ENEMY_BACK_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'attack', target: 'nearest_enemy' })
  })
})

describe('condition: target_exists — any_enemy selector', () => {
  it('fires when at least one enemy is on the battlefield', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'target_exists' as const, target: 'any_enemy' as const }, action: { kind: 'attack' as const, target: 'any_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_1)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'attack', target: 'any_enemy' })
  })

  it('does NOT fire when no enemies exist', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'target_exists' as const, target: 'any_enemy' as const }, action: { kind: 'attack' as const, target: 'any_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit) // no enemies
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })
})

// ---------------------------------------------------------------------------
// Fall-through to idle
// ---------------------------------------------------------------------------

describe('fall-through to idle', () => {
  it('returns idle when no rule matches (empty gambit list)', () => {
    const unit = { ...PLAYER, gambits: [] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })

  it('returns idle when all conditions are unsatisfied', () => {
    // self_hp_below 10% — unit is at full HP, won't fire
    // target_exists nearest_enemy — no enemies present, won't fire
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'self_hp_below' as const, pct: 10 }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
      { condition: { kind: 'target_exists' as const, target: 'nearest_enemy' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit) // no enemies, full HP
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })
})

// ---------------------------------------------------------------------------
// Rule priority
// ---------------------------------------------------------------------------

describe('rule priority', () => {
  it('fires the first matching rule, not later ones', () => {
    const unit = { ...PLAYER, gambits: [
      { condition: { kind: 'always' as const }, action: { kind: 'idle' as const } },
      // This rule also matches but must never be reached
      { condition: { kind: 'always' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'idle' })
  })

  it('skips non-matching rules and fires the first that matches', () => {
    const unit = { ...PLAYER, hp: 10, maxHp: 80, gambits: [
      // Won't fire: 10/80 = 12.5% — not below 10%
      { condition: { kind: 'self_hp_below' as const, pct: 10 }, action: { kind: 'idle' as const } },
      // Will fire: target_exists nearest_enemy — enemy is present
      { condition: { kind: 'target_exists' as const, target: 'nearest_enemy' as const }, action: { kind: 'attack' as const, target: 'nearest_enemy' as const } },
    ] }
    const bf = makeBattlefield(unit, ENEMY_FRONT_0)
    expect(chooseAction(unit, bf)).toEqual({ kind: 'attack', target: 'nearest_enemy' })
  })
})
