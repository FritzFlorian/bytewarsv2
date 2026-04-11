// Hand-written CombatEvent fixture for render-layer development.
//
// Represents a 2 v 2 walking-skeleton fight that resolves in 7 rounds.
// Does NOT depend on the resolver — the event log was computed manually to
// match the walking-skeleton fixture values (10 dmg/attack, player 80 HP,
// enemy 60 HP) so it stays plausible when compared against `pnpm run:fixture`.
//
// Fight summary:
//   Rounds 1–3 : vacuum + butler focus e-qr1; both enemy rigs hit p-vacuum
//   End R3      : e-qr1 destroyed (took 3 × 20 dmg = 60)
//   Rounds 4–5 : vacuum + butler switch to e-qr2; e-qr2 keeps hitting p-vacuum
//   End R5      : p-vacuum destroyed (took 6 × 10 dmg from enemy rigs = 60 total)
//   Rounds 6–7 : only p-butler vs e-qr2
//   End R7      : e-qr2 destroyed → player wins

import type { CombatEvent } from '../../../logic/combat/events'
import type { UnitInfo } from '../../playback'

export const sampleUnits: UnitInfo[] = [
  {
    id: 'p-vacuum',
    side: 'player',
    slot: { side: 'player', row: 'front', column: 0 },
    hp: 80,
    maxHp: 80,
    chassis: 'vacuum',
  },
  {
    id: 'p-butler',
    side: 'player',
    slot: { side: 'player', row: 'front', column: 1 },
    hp: 80,
    maxHp: 80,
    chassis: 'butler',
  },
  {
    id: 'e-qr1',
    side: 'enemy',
    slot: { side: 'enemy', row: 'front', column: 0 },
    hp: 60,
    maxHp: 60,
    chassis: 'qa-rig',
  },
  {
    id: 'e-qr2',
    side: 'enemy',
    slot: { side: 'enemy', row: 'front', column: 1 },
    hp: 60,
    maxHp: 60,
    chassis: 'qa-rig',
  },
]

// Helpers to reduce repetition when building turns.
function attackTurn(
  actorId: string,
  targetId: string,
  damage: number,
): CombatEvent[] {
  return [
    { kind: 'turn_started', unitId: actorId },
    { kind: 'rule_fired', unitId: actorId, ruleIndex: 0 },
    {
      kind: 'action_used',
      unitId: actorId,
      action: { kind: 'attack', target: 'nearest_enemy' },
      targets: [targetId],
    },
    { kind: 'damage_dealt', sourceId: actorId, targetId, amount: damage },
    { kind: 'turn_ended', unitId: actorId },
  ]
}

function destroyingTurn(
  actorId: string,
  targetId: string,
  damage: number,
): CombatEvent[] {
  return [
    { kind: 'turn_started', unitId: actorId },
    { kind: 'rule_fired', unitId: actorId, ruleIndex: 0 },
    {
      kind: 'action_used',
      unitId: actorId,
      action: { kind: 'attack', target: 'nearest_enemy' },
      targets: [targetId],
    },
    { kind: 'damage_dealt', sourceId: actorId, targetId, amount: damage },
    { kind: 'unit_destroyed', unitId: targetId },
    { kind: 'turn_ended', unitId: actorId },
  ]
}

export const sampleEvents: CombatEvent[] = [
  // ── Round 1 ─────────────────────────────────────────────────────────
  { kind: 'round_started', round: 1 },
  ...attackTurn('p-vacuum', 'e-qr1', 10),  // e-qr1: 60→50
  ...attackTurn('e-qr1',   'p-vacuum', 10), // p-vacuum: 80→70
  ...attackTurn('p-butler', 'e-qr1', 10),  // e-qr1: 50→40
  ...attackTurn('e-qr2',   'p-vacuum', 10), // p-vacuum: 70→60
  { kind: 'round_ended', round: 1 },

  // ── Round 2 ─────────────────────────────────────────────────────────
  { kind: 'round_started', round: 2 },
  ...attackTurn('p-vacuum', 'e-qr1', 10),  // e-qr1: 40→30
  ...attackTurn('e-qr1',   'p-vacuum', 10), // p-vacuum: 60→50
  ...attackTurn('p-butler', 'e-qr1', 10),  // e-qr1: 30→20
  ...attackTurn('e-qr2',   'p-vacuum', 10), // p-vacuum: 50→40
  { kind: 'round_ended', round: 2 },

  // ── Round 3 ─────────────────────────────────────────────────────────
  { kind: 'round_started', round: 3 },
  ...attackTurn('p-vacuum', 'e-qr1', 10),        // e-qr1: 20→10
  ...attackTurn('e-qr1',   'p-vacuum', 10),       // p-vacuum: 40→30
  ...destroyingTurn('p-butler', 'e-qr1', 10),     // e-qr1: 10→0, DESTROYED
  ...attackTurn('e-qr2',   'p-vacuum', 10),       // p-vacuum: 30→20
  { kind: 'round_ended', round: 3 },

  // ── Round 4 (e-qr1 dead; both players switch to e-qr2) ──────────────
  { kind: 'round_started', round: 4 },
  ...attackTurn('p-vacuum', 'e-qr2', 10),  // e-qr2: 60→50
  ...attackTurn('p-butler', 'e-qr2', 10),  // e-qr2: 50→40
  ...attackTurn('e-qr2',   'p-vacuum', 10), // p-vacuum: 20→10
  { kind: 'round_ended', round: 4 },

  // ── Round 5 ─────────────────────────────────────────────────────────
  { kind: 'round_started', round: 5 },
  ...attackTurn('p-vacuum', 'e-qr2', 10),        // e-qr2: 40→30
  ...attackTurn('p-butler', 'e-qr2', 10),        // e-qr2: 30→20
  ...destroyingTurn('e-qr2',  'p-vacuum', 10),   // p-vacuum: 10→0, DESTROYED
  { kind: 'round_ended', round: 5 },

  // ── Round 6 (only p-butler vs e-qr2) ────────────────────────────────
  { kind: 'round_started', round: 6 },
  ...attackTurn('p-butler', 'e-qr2', 10),  // e-qr2: 20→10
  ...attackTurn('e-qr2',   'p-butler', 10), // p-butler: 80→70
  { kind: 'round_ended', round: 6 },

  // ── Round 7 (final blow) ─────────────────────────────────────────────
  { kind: 'round_started', round: 7 },
  ...destroyingTurn('p-butler', 'e-qr2', 10), // e-qr2: 10→0, DESTROYED
  { kind: 'combat_ended', winner: 'player' },
]
