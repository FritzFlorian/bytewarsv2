// Player-squad loader for Bytewars v0.4.
//
// Reads src/content/player-squad.json, validates it with the Zod schema,
// and returns typed Unit[] ready for use in the logic layer.
//
// Throws a descriptive error if the JSON is malformed (bad chassis name,
// missing field, out-of-range column, etc.).

import type { Unit } from '../state/types'
import { PlayerSquadSchema } from '../../content/schema/playerSquad'
import squadJson from '../../content/player-squad.json'

export function loadPlayerSquad(): Unit[] {
  const parsed = PlayerSquadSchema.safeParse(squadJson)

  if (!parsed.success) {
    const msg = parsed.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid player-squad.json:\n${msg}`)
  }

  return parsed.data.units.map(u => ({
    id: u.id,
    side: 'player' as const,
    slot: {
      side: 'player' as const,
      row: u.row,
      column: u.column,
    },
    chassis: u.chassis,
    hp: u.maxHp,
    maxHp: u.maxHp,
    gambits: u.gambits,
  }))
}
