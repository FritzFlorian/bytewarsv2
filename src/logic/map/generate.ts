// Map generator for Bytewars v0.4.
//
// Produces a seeded, branching horizontal graph:
//   - 10–12 columns of combat nodes
//   - 1–3 nodes per column, spread across lanes 0/1/2
//   - A single Boss node in the final column
//   - Edges so every node is reachable and every non-boss node has at
//     least one forward edge.

import type { Rng } from '../rng'
import type { MapGraph, MapNode, MapEdge } from './types'

/** Fisher-Yates shuffle using the seeded RNG. */
function shuffle<T>(arr: T[], rng: Rng): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Lane sets for 1, 2, and 3 nodes in a column.
 * With 1 node we use the centre lane; with 2 we use top+bottom; with 3 all lanes.
 */
const LANE_SETS: Record<number, number[]> = {
  1: [1],
  2: [0, 2],
  3: [0, 1, 2],
}

export function generateMap(rng: Rng): MapGraph {
  // 10, 11, or 12 columns total (last column is the boss)
  const numColumns = 10 + rng.nextInt(3)

  const nodes: MapNode[] = []
  const edges: MapEdge[] = []

  // columnNodes[col] holds the nodes in that column.
  const columnNodes: MapNode[][] = []

  // --- Build combat-node columns (all but the last) ---
  for (let col = 0; col < numColumns - 1; col++) {
    const numLanes = 1 + rng.nextInt(3) // 1, 2, or 3
    const lanes = LANE_SETS[numLanes]
    const colNodes: MapNode[] = lanes.map(lane => ({
      id: `node-${col}-${lane}`,
      type: 'combat',
      column: col,
      lane,
    }))
    nodes.push(...colNodes)
    columnNodes.push(colNodes)
  }

  // --- Boss node (last column, centre lane) ---
  const bossNode: MapNode = {
    id: `node-${numColumns - 1}-1`,
    type: 'boss',
    column: numColumns - 1,
    lane: 1,
  }
  nodes.push(bossNode)
  columnNodes.push([bossNode])

  // --- Generate edges ---
  for (let col = 0; col < numColumns - 1; col++) {
    const from = columnNodes[col]
    const to = columnNodes[col + 1]
    const hasIncoming = new Set<string>()

    for (const fromNode of from) {
      // Each node connects to 1 or 2 targets (always 1 if only one choice).
      const maxTargets = Math.min(2, to.length)
      const numTargets = maxTargets === 1 ? 1 : 1 + rng.nextInt(2)
      const shuffled = shuffle(to, rng)
      for (let i = 0; i < numTargets; i++) {
        edges.push({ from: fromNode.id, to: shuffled[i].id })
        hasIncoming.add(shuffled[i].id)
      }
    }

    // Second pass: ensure every 'to' node has at least one incoming edge.
    for (const toNode of to) {
      if (!hasIncoming.has(toNode.id)) {
        const fromNode = from[rng.nextInt(from.length)]
        edges.push({ from: fromNode.id, to: toNode.id })
      }
    }
  }

  return { nodes, edges }
}
