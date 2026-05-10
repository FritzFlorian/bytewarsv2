// Enemy encounter fixtures for Bytewars v0.7.
//
// v0.7 changes: units are UnitInstance with installed modules. Enemy units
// carry active modules matching their attack patterns. HP comes from chassis
// base + any passive modules installed on the fixture.
//
// Chassis used:
//   - vacuum  : player melee attacker — uses quick_jab / sweep
//   - butler  : player support attacker — uses taser / overload
//   - qa-rig  : enemy attacker × 2 — uses clamp
//   - overseer: boss chassis × 3 — uses suppression
//   - swarmer : low-HP pressure unit — uses bite
//   - siege   : heavy frame with siege_cannon

import { UnitInstance } from '../state/UnitInstance'
import type { GambitList } from '../gambits/types'
import type { Rng } from '../rng'
import type { SlotRef, Side } from '../state/types'

// ── Gambit lists ──────────────────────────────────────────────────────────

const vacuumGambits: GambitList = [
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'sweep', target: 'nearest_enemy' },
  },
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'quick_jab', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const butlerGambits: GambitList = [
  {
    condition: { kind: 'self_hp_below', pct: 50 },
    action: { kind: 'overload', target: 'any_enemy' },
  },
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'taser', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const qaRigGambits: GambitList = [
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'clamp', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const overseerGambits: GambitList = [
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'suppression', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'suppression', target: 'any_enemy' } },
]

const swarmerGambits: GambitList = [
  {
    condition: { kind: 'target_exists', target: 'nearest_enemy' },
    action: { kind: 'bite', target: 'nearest_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

const siegeGambits: GambitList = [
  {
    condition: { kind: 'target_exists', target: 'any_enemy' },
    action: { kind: 'siege_cannon', target: 'any_enemy' },
  },
  { condition: { kind: 'always' }, action: { kind: 'idle' } },
]

// Elite qa-rig uses the same gambits as regular qa-rig.
const qaRigEliteGambits = qaRigGambits

// ── Helpers ───────────────────────────────────────────────────────────────

function makeUnit(
  id: string,
  side: Side,
  slot: SlotRef,
  chassis: UnitInstance['chassis'],
  activeModuleIds: string[],
  passiveModuleIds: string[],
  gambits: GambitList,
  hpOverride?: number,
): UnitInstance {
  const activeModules = activeModuleIds.map(defId => ({ defId, cooldownRemaining: 0 }))
  const passiveModules = passiveModuleIds.map(defId => ({ defId }))
  const unit = new UnitInstance(id, side, slot, chassis, 0, activeModules, passiveModules, gambits)
  // Use hpOverride if provided, otherwise start at computed maxHp
  unit.hp = hpOverride ?? unit.maxHp
  return unit
}

// ── Walking skeleton ──────────────────────────────────────────────────────

export interface WalkingSkeletonFixture {
  playerUnits: UnitInstance[]
  enemyUnits: UnitInstance[]
}

export function walkingSkeletonFixture(): WalkingSkeletonFixture {
  const playerUnits: UnitInstance[] = [
    makeUnit(
      'player-vacuum-1',
      'player',
      { side: 'player', row: 'front', column: 0 },
      'vacuum',
      ['sweep', 'quick_jab'],
      [],
      vacuumGambits,
      80,
    ),
    makeUnit(
      'player-butler-1',
      'player',
      { side: 'player', row: 'front', column: 1 },
      'butler',
      ['overload', 'taser'],
      [],
      butlerGambits,
      80,
    ),
  ]

  const enemyUnits: UnitInstance[] = [
    makeUnit(
      'enemy-qa-rig-1',
      'enemy',
      { side: 'enemy', row: 'front', column: 0 },
      'qa-rig',
      ['clamp'],
      [],
      qaRigGambits,
      40,
    ),
    makeUnit(
      'enemy-qa-rig-2',
      'enemy',
      { side: 'enemy', row: 'front', column: 1 },
      'qa-rig',
      ['clamp'],
      [],
      qaRigGambits,
      40,
    ),
  ]

  return { playerUnits, enemyUnits }
}

// ── Boss encounter ────────────────────────────────────────────────────────

export interface BossEncounterFixture {
  enemyUnits: UnitInstance[]
}

export function bossEncounterFixture(): BossEncounterFixture {
  const enemyUnits: UnitInstance[] = [
    makeUnit(
      'boss-overseer-1',
      'enemy',
      { side: 'enemy', row: 'front', column: 0 },
      'overseer',
      ['suppression'],
      [],
      overseerGambits,
      80,
    ),
    makeUnit(
      'boss-overseer-2',
      'enemy',
      { side: 'enemy', row: 'front', column: 1 },
      'overseer',
      ['suppression'],
      [],
      overseerGambits,
      80,
    ),
    makeUnit(
      'boss-overseer-3',
      'enemy',
      { side: 'enemy', row: 'front', column: 2 },
      'overseer',
      ['suppression'],
      [],
      overseerGambits,
      80,
    ),
  ]

  return { enemyUnits }
}

// ── Elite encounters ──────────────────────────────────────────────────────

export interface EliteEncounterFixture {
  id: string
  enemyUnits: UnitInstance[]
}

function siegeBattery(): EliteEncounterFixture {
  return {
    id: 'siege-battery',
    enemyUnits: [
      makeUnit(
        'elite-siege-1',
        'enemy',
        { side: 'enemy', row: 'back', column: 1 },
        'siege',
        ['siege_cannon'],
        [],
        siegeGambits,
        90,
      ),
      makeUnit(
        'elite-swarmer-1',
        'enemy',
        { side: 'enemy', row: 'front', column: 0 },
        'swarmer',
        ['bite'],
        [],
        swarmerGambits,
        35,
      ),
      makeUnit(
        'elite-swarmer-2',
        'enemy',
        { side: 'enemy', row: 'front', column: 2 },
        'swarmer',
        ['bite'],
        [],
        swarmerGambits,
        35,
      ),
    ],
  }
}

function heavyLine(): EliteEncounterFixture {
  return {
    id: 'heavy-line',
    enemyUnits: [
      makeUnit(
        'elite-siege-1',
        'enemy',
        { side: 'enemy', row: 'back', column: 1 },
        'siege',
        ['siege_cannon'],
        [],
        siegeGambits,
        90,
      ),
      makeUnit(
        'elite-qa-1',
        'enemy',
        { side: 'enemy', row: 'front', column: 0 },
        'qa-rig',
        ['clamp'],
        [],
        qaRigEliteGambits,
        80,
      ),
      makeUnit(
        'elite-qa-2',
        'enemy',
        { side: 'enemy', row: 'front', column: 2 },
        'qa-rig',
        ['clamp'],
        [],
        qaRigEliteGambits,
        80,
      ),
    ],
  }
}

function swarmPack(): EliteEncounterFixture {
  return {
    id: 'swarm-pack',
    enemyUnits: [
      makeUnit(
        'elite-swarmer-1',
        'enemy',
        { side: 'enemy', row: 'front', column: 0 },
        'swarmer',
        ['bite'],
        [],
        swarmerGambits,
        40,
      ),
      makeUnit(
        'elite-swarmer-2',
        'enemy',
        { side: 'enemy', row: 'front', column: 1 },
        'swarmer',
        ['bite'],
        [],
        swarmerGambits,
        40,
      ),
      makeUnit(
        'elite-swarmer-3',
        'enemy',
        { side: 'enemy', row: 'front', column: 2 },
        'swarmer',
        ['bite'],
        [],
        swarmerGambits,
        40,
      ),
      makeUnit(
        'elite-swarmer-4',
        'enemy',
        { side: 'enemy', row: 'middle', column: 1 },
        'swarmer',
        ['bite'],
        [],
        swarmerGambits,
        40,
      ),
    ],
  }
}

function qaSquadElite(): EliteEncounterFixture {
  return {
    id: 'qa-squad-elite',
    enemyUnits: [
      makeUnit(
        'elite-qa-1',
        'enemy',
        { side: 'enemy', row: 'front', column: 0 },
        'qa-rig',
        ['clamp'],
        [],
        qaRigEliteGambits,
        90,
      ),
      makeUnit(
        'elite-qa-2',
        'enemy',
        { side: 'enemy', row: 'front', column: 1 },
        'qa-rig',
        ['clamp'],
        [],
        qaRigEliteGambits,
        90,
      ),
      makeUnit(
        'elite-qa-3',
        'enemy',
        { side: 'enemy', row: 'front', column: 2 },
        'qa-rig',
        ['clamp'],
        [],
        qaRigEliteGambits,
        90,
      ),
    ],
  }
}

export function getAllEliteFixtures(): EliteEncounterFixture[] {
  return [siegeBattery(), heavyLine(), swarmPack(), qaSquadElite()]
}

export function drawEliteEncounter(rng: Rng): EliteEncounterFixture {
  const pool = getAllEliteFixtures()
  return pool[rng.nextInt(pool.length)]
}
