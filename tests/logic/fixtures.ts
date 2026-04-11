// Placeholder fixture used to exercise T-1.2 types at compile time.
// Real walking-skeleton fixture is in T-2A.1 (src/logic/content/fixtures.ts).

import type { Rule } from '../../src/logic/gambits/types'

export const sampleRules: Rule[] = [
  { condition: { kind: 'always' }, action: { kind: 'attack', target: 'nearest_enemy' } },
  { condition: { kind: 'self_hp_below', pct: 30 }, action: { kind: 'idle' } },
  { condition: { kind: 'target_exists', target: 'any_enemy' }, action: { kind: 'attack', target: 'any_enemy' } },
]
