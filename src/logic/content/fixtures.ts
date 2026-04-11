// Walking-skeleton fixture for Bytewars v0.1.
//
// Hardcoded only — no JSON loaders, no Zod. Content data files land in v0.2.
// HP values are per Q-V0.1-2: player units at 80 HP, enemy units at 60 HP.
// Damage is fixed at 10 per attack (no variance) — revisit when modules land in v0.2.
//
// Chassis used:
//   - vacuum  : player melee attacker
//   - butler  : player support attacker (gambit exercises self_hp_below)
//   - qa-rig  : enemy attacker × 2

import type { Unit } from '../state/types'
import type { GambitList } from '../gambits/types'

const vacuumGambits: GambitList = [
  // Primary: always attack the nearest enemy
  { condition: { kind: 'target_exists', target: 'nearest_enemy' }, action: { kind: 'attack', target: 'nearest_enemy' } },
  // Fallback: idle
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const butlerGambits: GambitList = [
  // When below 50% HP, strike any enemy (exercises self_hp_below + any_enemy)
  { condition: { kind: 'self_hp_below', pct: 50 }, action: { kind: 'attack', target: 'any_enemy' } },
  // Otherwise, attack nearest enemy
  { condition: { kind: 'target_exists', target: 'nearest_enemy' }, action: { kind: 'attack', target: 'nearest_enemy' } },
  // Fallback: idle
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const qaRigGambits: GambitList = [
  // Attack nearest enemy unconditionally
  { condition: { kind: 'target_exists', target: 'nearest_enemy' }, action: { kind: 'attack', target: 'nearest_enemy' } },
  // Fallback: idle
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

export interface WalkingSkeletonFixture {
  playerUnits: Unit[]
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
