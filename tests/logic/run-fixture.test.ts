// Walking-skeleton fixture run — pretty-prints the full event log to stdout.
//
// This is the T-2A.4 "headless run script", implemented as a Vitest test so it
// stays within pnpm-mediated execution (pnpm run:fixture → vitest run <this file>).
// Useful for inspecting real event-log shape when developing the render track.
//
// Run with:   pnpm run:fixture
// Or inline:  pnpm test --run tests/logic/run-fixture.test.ts

import { test } from 'vitest'
import { createCombat, resolveRound, isCombatOver, walkingSkeletonFixture } from '../../src/logic'
import type { CombatEvent } from '../../src/logic'

const SEED = 42

function formatEvent(e: CombatEvent): string {
  switch (e.kind) {
    case 'round_started':    return `\n--- Round ${e.round} ---`
    case 'round_ended':      return `--- End round ${e.round} ---`
    case 'turn_started':     return `  [${e.unitId}] turn start`
    case 'turn_ended':       return `  [${e.unitId}] turn end`
    case 'rule_fired':       return `  [${e.unitId}] rule #${e.ruleIndex} fired`
    case 'action_used':      return `  [${e.unitId}] ${e.action.kind} → [${e.targets.join(', ')}]`
    case 'damage_dealt':     return `  [${e.sourceId}] → [${e.targetId}]  -${e.amount} HP`
    case 'unit_destroyed':   return `  [${e.unitId}] DESTROYED`
    case 'combat_ended':     return `\n=== Combat ended — winner: ${e.winner} ===`
  }
}

test('run walking-skeleton fixture to completion (seed 42)', () => {
  const { playerUnits, enemyUnits } = walkingSkeletonFixture()
  let state = createCombat(SEED, playerUnits, enemyUnits)
  const allEvents: CombatEvent[] = []

  const ROUND_CAP = 100
  let rounds = 0

  while (!isCombatOver(state) && rounds < ROUND_CAP) {
    const result = resolveRound(state)
    state = result.state
    allEvents.push(...result.events)
    rounds++
  }

  for (const e of allEvents) {
    console.log(formatEvent(e))
  }

  // Sanity-check so the test actually asserts something.
  const ended = allEvents.find(e => e.kind === 'combat_ended')
  if (!ended) throw new Error('combat_ended event never emitted within round cap')
})
