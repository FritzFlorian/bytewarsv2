// Navigation helpers for Bytewars v0.4 run-map.
//
// getReachableNodes — which nodes can the player move to next?
// selectNode       — commit to a node; validates reachability.
// createRunState   — factory for a fresh RunState from a map + starting squad.

import type { Unit } from '../state/types'
import type { MapGraph, MapNode, RunState } from './types'

/** Returns the nodes the player can select next (forward edges from current). */
export function getReachableNodes(run: RunState): MapNode[] {
  if (run.currentNodeId === null) {
    // Not yet started — the first column is reachable.
    const minCol = Math.min(...run.graph.nodes.map(n => n.column))
    return run.graph.nodes.filter(n => n.column === minCol)
  }

  const targets = new Set(run.graph.edges.filter(e => e.from === run.currentNodeId).map(e => e.to))
  return run.graph.nodes.filter(n => targets.has(n.id))
}

/**
 * Move to a node.  Throws if the node is not reachable from the current position.
 * The previously-current node (if any) is added to visitedNodeIds.
 */
export function selectNode(run: RunState, nodeId: string): RunState {
  const reachable = getReachableNodes(run)
  if (!reachable.some(n => n.id === nodeId)) {
    throw new Error(`Node "${nodeId}" is not reachable from "${run.currentNodeId ?? 'start'}"`)
  }

  const newVisited = new Set(run.visitedNodeIds)
  if (run.currentNodeId !== null) {
    newVisited.add(run.currentNodeId)
  }

  return { ...run, currentNodeId: nodeId, visitedNodeIds: newVisited }
}

/** Build the initial RunState for a new run. */
export function createRunState(graph: MapGraph, playerUnits: Unit[]): RunState {
  const hpSnapshot: Record<string, number> = {}
  const maxHpMap: Record<string, number> = {}

  for (const unit of playerUnits) {
    hpSnapshot[unit.id] = unit.hp
    maxHpMap[unit.id] = unit.maxHp
  }

  return {
    graph,
    currentNodeId: null,
    visitedNodeIds: new Set<string>(),
    hpSnapshot,
    maxHpMap,
    sittingOut: new Set<string>(),
    status: 'active',
  }
}
