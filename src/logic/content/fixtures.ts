// Walking-skeleton fixture for Bytewars v0.5.
//
// Updated from v0.1: gambits now use named attack IDs instead of the generic
// `{ kind: 'attack' }` action. HP values remain unchanged.
//
// Chassis used:
//   - vacuum  : player melee attacker — uses quick_jab / sweep
//   - butler  : player support attacker — uses taser / overload
//   - qa-rig  : enemy attacker × 2 — uses clamp
//   - overseer: boss chassis × 3 — uses suppression

import type { Unit } from '../state/types'
import type { GambitList } from '../gambits/types'

const vacuumGambits: GambitList = [
  // Primary: sweep if available (high damage), otherwise quick_jab
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'sweep', target: 'nearest_enemy' },
  },
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'quick_jab', target: 'nearest_enemy' },
  },
  // Fallback: idle
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const butlerGambits: GambitList = [
  // When below 50% HP, strike any enemy with overload if available
  {
    condition: { kind: 'self_hp_below', pct: 50 },
    action: { kind: 'overload', target: 'any_enemy' },
  },
  // Otherwise, taser nearest enemy
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'taser', target: 'nearest_enemy' },
  },
  // Fallback: idle
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const qaRigGambits: GambitList = [
  // Attack nearest enemy with clamp
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'clamp', target: 'nearest_enemy' },
  },
  // Fallback: idle
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

export interface WalkingSkeletonFixture {
  playerUnits: Unit[]
  enemyUnits: Unit[]
}

export interface BossEncounterFixture {
  enemyUnits: Unit[]
}

export function walkingSkeletonFixture(): WalkingSkeletonFixture {
  const playerUnits: Unit[] = [
    {
      id: 'player-vacuum-1',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 0 },
      chassis: 'vacuum',
      hp: 80,
      maxHp: 80,
      gambits: vacuumGambits,
    },
    {
      id: 'player-butler-1',
      side: 'player',
      slot: { side: 'player', row: 'front', column: 1 },
      chassis: 'butler',
      hp: 80,
      maxHp: 80,
      gambits: butlerGambits,
    },
  ]

  const enemyUnits: Unit[] = [
    {
      id: 'enemy-qa-rig-1',
      side: 'enemy',
      slot: { side: 'enemy', row: 'front', column: 0 },
      chassis: 'qa-rig',
      hp: 60,
      maxHp: 60,
      gambits: qaRigGambits,
    },
    {
      id: 'enemy-qa-rig-2',
      side: 'enemy',
      slot: { side: 'enemy', row: 'front', column: 1 },
      chassis: 'qa-rig',
      hp: 60,
      maxHp: 60,
      gambits: qaRigGambits,
    },
  ]

  return { playerUnits, enemyUnits }
}

// v0.5 boss encounter — 3 Overseer units at 120 HP each using suppression.
const overseerGambits: GambitList = [
  // Primary: suppression on nearest enemy
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'suppression', target: 'nearest_enemy' },
  },
  // Fallback: suppression on any enemy
  { condition: { kind: 'always' }, action: { kind: 'suppression', target: 'any_enemy' } },
]

export function bossEncounterFixture(): BossEncounterFixture {
  const enemyUnits: Unit[] = [
    {
      id: 'boss-overseer-1',
      side: 'enemy',
      slot: { side: 'enemy', row: 'front', column: 0 },
      chassis: 'overseer',
      hp: 120,
      maxHp: 120,
      gambits: overseerGambits,
    },
    {
      id: 'boss-overseer-2',
      side: 'enemy',
      slot: { side: 'enemy', row: 'front', column: 1 },
      chassis: 'overseer',
      hp: 120,
      maxHp: 120,
      gambits: overseerGambits,
    },
    {
      id: 'boss-overseer-3',
      side: 'enemy',
      slot: { side: 'enemy', row: 'front', column: 2 },
      chassis: 'overseer',
      hp: 120,
      maxHp: 120,
      gambits: overseerGambits,
    },
  ]

  return { enemyUnits }
}
