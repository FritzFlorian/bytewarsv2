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
import type { Rng } from '../rng'

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

// ── Elite encounters (T-6.10) ──────────────────────────────────────────────
//
// Q-R6: 4 hand-authored elite enemy-squad fixtures, harder than regular
// combat. Siege chassis appears in exactly 2 of the 4. The pool is sampled
// per-elite-node so the same map can roll the same fixture twice; that's
// fine — variety comes from the 4-way pick, not from de-duplication.

const swarmerGambits: GambitList = [
  // Pure pressure — bite the closest enemy every turn.
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'bite', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const siegeGambits: GambitList = [
  // Siege Cannon when off cooldown; otherwise idle (no fallback attack —
  // the cannon's long cooldown is the whole identity of this chassis).
  {
    condition: { kind: 'target_exists', target: 'any_enemy' },
    action: { kind: 'siege_cannon', target: 'any_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const qaRigEliteGambits: GambitList = [
  // Same gambits as regular qa-rig, but tuned-up HP makes the fixture harder.
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'clamp', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

export interface EliteEncounterFixture {
  /** Stable identifier for tests + balance tuning. */
  id: string
  enemyUnits: Unit[]
}

function siegeBattery(): EliteEncounterFixture {
  return {
    id: 'siege-battery',
    enemyUnits: [
      {
        id: 'elite-siege-1',
        side: 'enemy',
        slot: { side: 'enemy', row: 'back', column: 1 },
        chassis: 'siege',
        hp: 90,
        maxHp: 90,
        gambits: siegeGambits,
      },
      {
        id: 'elite-swarmer-1',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 0 },
        chassis: 'swarmer',
        hp: 35,
        maxHp: 35,
        gambits: swarmerGambits,
      },
      {
        id: 'elite-swarmer-2',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 2 },
        chassis: 'swarmer',
        hp: 35,
        maxHp: 35,
        gambits: swarmerGambits,
      },
    ],
  }
}

function heavyLine(): EliteEncounterFixture {
  return {
    id: 'heavy-line',
    enemyUnits: [
      {
        id: 'elite-siege-1',
        side: 'enemy',
        slot: { side: 'enemy', row: 'back', column: 1 },
        chassis: 'siege',
        hp: 90,
        maxHp: 90,
        gambits: siegeGambits,
      },
      {
        id: 'elite-qa-1',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 0 },
        chassis: 'qa-rig',
        hp: 80,
        maxHp: 80,
        gambits: qaRigEliteGambits,
      },
      {
        id: 'elite-qa-2',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 2 },
        chassis: 'qa-rig',
        hp: 80,
        maxHp: 80,
        gambits: qaRigEliteGambits,
      },
    ],
  }
}

function swarmPack(): EliteEncounterFixture {
  return {
    id: 'swarm-pack',
    enemyUnits: [
      {
        id: 'elite-swarmer-1',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 0 },
        chassis: 'swarmer',
        hp: 40,
        maxHp: 40,
        gambits: swarmerGambits,
      },
      {
        id: 'elite-swarmer-2',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 1 },
        chassis: 'swarmer',
        hp: 40,
        maxHp: 40,
        gambits: swarmerGambits,
      },
      {
        id: 'elite-swarmer-3',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 2 },
        chassis: 'swarmer',
        hp: 40,
        maxHp: 40,
        gambits: swarmerGambits,
      },
      {
        id: 'elite-swarmer-4',
        side: 'enemy',
        slot: { side: 'enemy', row: 'middle', column: 1 },
        chassis: 'swarmer',
        hp: 40,
        maxHp: 40,
        gambits: swarmerGambits,
      },
    ],
  }
}

function qaSquadElite(): EliteEncounterFixture {
  return {
    id: 'qa-squad-elite',
    enemyUnits: [
      {
        id: 'elite-qa-1',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 0 },
        chassis: 'qa-rig',
        hp: 90,
        maxHp: 90,
        gambits: qaRigEliteGambits,
      },
      {
        id: 'elite-qa-2',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 1 },
        chassis: 'qa-rig',
        hp: 90,
        maxHp: 90,
        gambits: qaRigEliteGambits,
      },
      {
        id: 'elite-qa-3',
        side: 'enemy',
        slot: { side: 'enemy', row: 'front', column: 2 },
        chassis: 'qa-rig',
        hp: 90,
        maxHp: 90,
        gambits: qaRigEliteGambits,
      },
    ],
  }
}

/**
 * The four elite fixtures. Order is stable so tests can index into it; runtime
 * draws use `drawEliteEncounter(rng)` which samples uniformly.
 *
 * Siege appears in `siege-battery` and `heavy-line` (2 of 4) per Q-R6.
 */
export function getAllEliteFixtures(): EliteEncounterFixture[] {
  return [siegeBattery(), heavyLine(), swarmPack(), qaSquadElite()]
}

/** Draw one elite fixture uniformly from the 4-fixture pool. */
export function drawEliteEncounter(rng: Rng): EliteEncounterFixture {
  const pool = getAllEliteFixtures()
  return pool[rng.nextInt(pool.length)]
}

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
