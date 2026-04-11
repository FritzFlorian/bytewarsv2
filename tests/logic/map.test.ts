// Tests for map generation and navigation (T-4.2).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { getReachableNodes, selectNode, createRunState } from '../../src/logic/map/navigation'
import type { RunState } from '../../src/logic/map/types'

// ── generateMap ────────────────────────────────────────────────────────────

describe('generateMap', () => {
  it('always has exactly one boss node at the last column', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(createRng(seed))
      const bossNodes = map.nodes.filter(n => n.type === 'boss')
      expect(bossNodes).toHaveLength(1)

      const maxCol = Math.max(...map.nodes.map(n => n.column))
      expect(bossNodes[0].column).toBe(maxCol)
    }
  })

  it('produces between 10 and 12 columns (inclusive)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const map = generateMap(createRng(seed))
      const maxCol = Math.max(...map.nodes.map(n => n.column))
      const numColumns = maxCol + 1
      expect(numColumns).toBeGreaterThanOrEqual(10)
      expect(numColumns).toBeLessThanOrEqual(12)
    }
  })

  it('never places more than 3 nodes in a single column', () => {
    for (let seed = 0; seed < 30; seed++) {
      const map = generateMap(createRng(seed))
      const countByCol = new Map<number, number>()
      for (const node of map.nodes) {
        countByCol.set(node.column, (countByCol.get(node.column) ?? 0) + 1)
      }
      for (const count of countByCol.values()) {
        expect(count).toBeLessThanOrEqual(3)
      }
    }
  })

  it('every non-boss node has at least one outgoing edge', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(createRng(seed))
      const outgoing = new Set(map.edges.map(e => e.from))
      for (const node of map.nodes) {
        if (node.type !== 'boss') {
          expect(outgoing.has(node.id)).toBe(true)
        }
      }
    }
  })

  it('every node except the first column has at least one incoming edge', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(createRng(seed))
      const minCol = Math.min(...map.nodes.map(n => n.column))
      const incoming = new Set(map.edges.map(e => e.to))
      for (const node of map.nodes) {
        if (node.column !== minCol) {
          expect(incoming.has(node.id)).toBe(true)
        }
      }
    }
  })

  it('lanes are always 0, 1, or 2', () => {
    for (let seed = 0; seed < 20; seed++) {
      const map = generateMap(createRng(seed))
      for (const node of map.nodes) {
        expect([0, 1, 2]).toContain(node.lane)
      }
    }
  })
})

// ── getReachableNodes ──────────────────────────────────────────────────────

describe('getReachableNodes', () => {
  function makeMinimalRun(): RunState {
    const map = generateMap(createRng(42))
    const run = createRunState(map, [])
    return run
  }

  it('returns first-column nodes when no current node (run start)', () => {
    const run = makeMinimalRun()
    expect(run.currentNodeId).toBeNull()
    const reachable = getReachableNodes(run)
    const minCol = Math.min(...run.graph.nodes.map(n => n.column))
    expect(reachable.length).toBeGreaterThan(0)
    for (const n of reachable) {
      expect(n.column).toBe(minCol)
    }
  })

  it('returns forward-edge targets after a node is selected', () => {
    const run = makeMinimalRun()
    const firstCol = getReachableNodes(run)
    const runAtFirst = selectNode(run, firstCol[0].id)

    const reachable = getReachableNodes(runAtFirst)
    const expectedTargets = new Set(
      run.graph.edges
        .filter(e => e.from === firstCol[0].id)
        .map(e => e.to),
    )
    expect(reachable.length).toBe(expectedTargets.size)
    for (const n of reachable) {
      expect(expectedTargets.has(n.id)).toBe(true)
    }
  })
})

// ── selectNode ─────────────────────────────────────────────────────────────

describe('selectNode', () => {
  it('moves currentNodeId to the selected node', () => {
    const map = generateMap(createRng(7))
    const run = createRunState(map, [])
    const reachable = getReachableNodes(run)
    const next = selectNode(run, reachable[0].id)
    expect(next.currentNodeId).toBe(reachable[0].id)
  })

  it('adds the previous currentNodeId to visitedNodeIds', () => {
    const map = generateMap(createRng(7))
    const run = createRunState(map, [])
    const col0 = getReachableNodes(run)
    const run1 = selectNode(run, col0[0].id)

    const col1 = getReachableNodes(run1)
    const run2 = selectNode(run1, col1[0].id)
    expect(run2.visitedNodeIds.has(col0[0].id)).toBe(true)
  })

  it('does not add null to visitedNodeIds on the first selection', () => {
    const map = generateMap(createRng(7))
    const run = createRunState(map, [])
    const col0 = getReachableNodes(run)
    const run1 = selectNode(run, col0[0].id)
    expect(run1.visitedNodeIds.size).toBe(0)
  })

  it('throws when selecting an unreachable node', () => {
    const map = generateMap(createRng(7))
    const run = createRunState(map, [])

    // Pick a node that is NOT in the first column.
    const bossNode = map.nodes.find(n => n.type === 'boss')!
    expect(() => selectNode(run, bossNode.id)).toThrow()
  })

  it('throws for a completely unknown node id', () => {
    const map = generateMap(createRng(7))
    const run = createRunState(map, [])
    expect(() => selectNode(run, 'nonexistent-node')).toThrow()
  })
})
