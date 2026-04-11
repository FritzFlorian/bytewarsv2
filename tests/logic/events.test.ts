import { expect, test } from 'vitest'
import type { CombatEvent } from '../../src/logic/combat/events'

test('T-1.3: CombatEvent round-trips through JSON serialization', () => {
  const events: CombatEvent[] = [
    { kind: 'round_started', round: 1 },
    { kind: 'turn_started', unitId: 'u1' },
    { kind: 'rule_fired', unitId: 'u1', ruleIndex: 0 },
    { kind: 'action_used', unitId: 'u1', action: { kind: 'quick_jab', target: 'nearest_enemy' }, targets: ['u3'] },
    { kind: 'damage_dealt', sourceId: 'u1', targetId: 'u3', amount: 10 },
    { kind: 'turn_ended', unitId: 'u1' },
    { kind: 'round_ended', round: 1 },
    { kind: 'unit_destroyed', unitId: 'u3' },
    { kind: 'combat_ended', winner: 'player' },
  ]

  const roundTripped = JSON.parse(JSON.stringify(events)) as CombatEvent[]
  expect(roundTripped).toEqual(events)
})
