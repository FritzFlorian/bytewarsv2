// Map and run-state types for Bytewars v0.4.
//
// The map is a seeded, branching horizontal graph of 10-12 columns leading
// to a single Boss node at the end.  Each column has 1-3 nodes arranged in
// up to 3 vertical lanes (0 = top, 1 = centre, 2 = bottom).
//
// RunState tracks everything needed to carry a run from the first fight
// through to victory or defeat.

import type { Reward } from '../rewards/types'

export type NodeType = 'combat' | 'elite' | 'boss' | 'repair_bay'

export interface MapNode {
  id: string
  type: NodeType
  /** Column index (0 = first combat node, numColumns-1 = boss). */
  column: number
  /** Vertical lane within the column: 0, 1, or 2. */
  lane: number
}

export interface MapEdge {
  from: string // MapNode id
  to: string // MapNode id
}

export interface MapGraph {
  nodes: MapNode[]
  edges: MapEdge[]
}

/** Outcome of a single fight plus surviving HP per unit. */
export interface BattleResult {
  winner: 'player' | 'enemy'
  /** Unit id → remaining HP after the fight (0 for dead units). */
  survivingHp: Record<string, number>
}

export interface RunState {
  graph: MapGraph
  /** Id of the node the player is currently at (null = not yet started). */
  currentNodeId: string | null
  /** Nodes the player has already fought at (no longer the current node). */
  visitedNodeIds: Set<string>
  /** Current HP for every player unit. 0 for dead units. */
  hpSnapshot: Record<string, number>
  /** Max HP for every player unit (needed for 42% revival calculation). */
  maxHpMap: Record<string, number>
  /** Unit ids sitting out the next fight (died last fight, return the fight after). */
  sittingOut: Set<string>
  /** Per-unit rule-slot count (T-6.9). Baseline 2, capped at 6 (Q-R4). */
  ruleSlotsMap: Record<string, number>
  status: 'active' | 'won' | 'lost'
  /** Reward offers awaiting player selection — set after combat/elite, cleared on pick (T-6.9). */
  pendingRewardOffers?: Reward[]
}
