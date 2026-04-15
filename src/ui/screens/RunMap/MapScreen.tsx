// MapScreen — horizontal node-graph run map for Bytewars v0.4.
//
// Renders the branching map (MapGraph) as a left-to-right column layout.
// Clicking a reachable node calls onNodeSelect; non-reachable nodes are
// inert.  A squad-status strip below shows each unit's name/chassis/HP.
//
// No external graph library — plain HTML/CSS/SVG only.

import { useMemo } from 'react'
import type { RunState, MapNode } from '../../../logic'
import { getReachableNodes } from '../../../logic'
import styles from './MapScreen.module.css'

// Layout constants (px)
const COL_WIDTH = 100
const LANE_HEIGHT = 80
const NODE_SIZE = 48
const NODE_RADIUS = NODE_SIZE / 2

/** Centre-point of a node in the grid (used for SVG lines). */
function nodeCenter(node: MapNode): { x: number; y: number } {
  return {
    x: node.column * COL_WIDTH + COL_WIDTH / 2,
    y: node.lane * LANE_HEIGHT + LANE_HEIGHT / 2,
  }
}

// ── Sub-component: single map node ───────────────────────────────

interface NodeButtonProps {
  node: MapNode
  isCurrent: boolean
  isReachable: boolean
  isVisited: boolean
  onSelect: (id: string) => void
}

function NodeButton({ node, isCurrent, isReachable, isVisited, onSelect }: NodeButtonProps) {
  let stateClass = styles.unreachable
  if (isCurrent) stateClass = styles.current
  else if (isVisited) stateClass = styles.visited
  else if (isReachable) stateClass = styles.reachable

  const typeClass =
    node.type === 'boss'
      ? styles.boss
      : node.type === 'elite'
        ? styles.elite
        : node.type === 'repair_bay'
          ? styles.repair
          : styles.combat
  const className = [styles.nodeButton, stateClass, typeClass].filter(Boolean).join(' ')

  const icon =
    node.type === 'boss'
      ? '☠'
      : node.type === 'elite'
        ? '✦'
        : node.type === 'repair_bay'
          ? '✚'
          : '⚔'

  const title =
    node.type === 'boss'
      ? 'Boss Fight'
      : node.type === 'elite'
        ? `Elite (col ${node.column})`
        : node.type === 'repair_bay'
          ? `Repair Bay (col ${node.column})`
          : `Combat (col ${node.column})`

  const center = nodeCenter(node)

  return (
    <div
      className={styles.nodeCell}
      style={{
        left: center.x - NODE_RADIUS,
        top: center.y - NODE_RADIUS,
        width: NODE_SIZE,
        height: NODE_SIZE,
      }}
    >
      <button
        className={className}
        disabled={!isReachable}
        onClick={isReachable ? () => onSelect(node.id) : undefined}
        title={title}
        data-node-id={node.id}
        data-node-type={node.type}
      >
        <span className={styles.nodeIcon}>{icon}</span>
      </button>
    </div>
  )
}

// ── Sub-component: squad status strip ────────────────────────────

interface UnitStatus {
  id: string
  name: string
  chassis: string
  hp: number
  maxHp: number
  sittingOut: boolean
}

function SquadStrip({ units }: { units: UnitStatus[] }) {
  return (
    <div className={styles.squadStrip}>
      {units.map(u => {
        const hpPct = u.maxHp > 0 ? Math.round((u.hp / u.maxHp) * 100) : 0
        const barClass = [
          styles.hpBarInner,
          hpPct <= 25 ? styles.hpBarInnerCritical : hpPct <= 50 ? styles.hpBarInnerLow : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={u.id}
            className={
              u.sittingOut ? `${styles.unitCard} ${styles.unitCardSittingOut}` : styles.unitCard
            }
          >
            <span className={styles.unitName}>{u.name}</span>
            <span className={styles.unitChassis}>{u.chassis}</span>
            {u.sittingOut ? (
              <span className={styles.sittingOutLabel}>sitting out</span>
            ) : (
              <>
                <div className={styles.hpBarOuter}>
                  <div className={barClass} style={{ width: `${hpPct}%` }} />
                </div>
                <span className={styles.hpText}>
                  {u.hp} / {u.maxHp}
                </span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────

export interface MapScreenProps {
  runState: RunState
  unitStatuses: UnitStatus[]
  onNodeSelect: (nodeId: string) => void
}

export function MapScreen({ runState, unitStatuses, onNodeSelect }: MapScreenProps) {
  const { graph, currentNodeId, visitedNodeIds } = runState

  const reachableSet = useMemo(() => {
    const reachable = getReachableNodes(runState)
    return new Set(reachable.map(n => n.id))
  }, [runState])

  // Determine which edges connect to reachable nodes (for styling).
  const reachableEdges = useMemo(
    () => new Set(graph.edges.filter(e => reachableSet.has(e.to)).map(e => `${e.from}:${e.to}`)),
    [graph.edges, reachableSet],
  )

  const numColumns = Math.max(...graph.nodes.map(n => n.column)) + 1
  const gridWidth = numColumns * COL_WIDTH
  const gridHeight = 3 * LANE_HEIGHT

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
        <span className={styles.subtitle}>Select your next encounter</span>
      </header>

      <SquadStrip units={unitStatuses} />

      <div className={styles.mapArea}>
        <div className={styles.mapGraph} style={{ width: gridWidth }}>
          {/* SVG edge lines — rendered behind the nodes */}
          <svg
            className={styles.edgeSvg}
            width={gridWidth}
            height={gridHeight}
            style={{ width: gridWidth, height: gridHeight }}
          >
            {graph.edges.map(edge => {
              const fromNode = graph.nodes.find(n => n.id === edge.from)
              const toNode = graph.nodes.find(n => n.id === edge.to)
              if (!fromNode || !toNode) return null
              const from = nodeCenter(fromNode)
              const to = nodeCenter(toNode)
              const key = `${edge.from}:${edge.to}`
              return (
                <line
                  key={key}
                  className={reachableEdges.has(key) ? styles.edgeLineReachable : styles.edgeLine}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                />
              )
            })}
          </svg>

          {/* Nodes */}
          <div className={styles.nodeGrid} style={{ width: gridWidth, height: gridHeight }}>
            {graph.nodes.map(node => (
              <NodeButton
                key={node.id}
                node={node}
                isCurrent={node.id === currentNodeId}
                isReachable={reachableSet.has(node.id)}
                isVisited={visitedNodeIds.has(node.id)}
                onSelect={onNodeSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
