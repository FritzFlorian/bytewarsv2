// CombatScene — render layer visual playback component.
//
// Takes a pre-resolved CombatEvent[] (from the logic layer or a hand-written
// fixture) and replays it visually with play / pause / step controls.
//
// v0.2 M2 additions:
//   - Active unit highlight (T-2.1): glow ring on the unit whose turn is live.
//   - Idle state badge (T-2.2): "…" badge with a pulse on units that chose idle.
//   - Target projectile (T-2.3): animated dot from attacker to target slot.
//   - Scrolling combat log (T-2.4): side panel that appends entries in sync.
//
// This component does NOT import from src/logic/combat/resolver — it only
// consumes the CombatEvent type. The separation is intentional: the render
// layer can be developed and tested against hand-written fixtures before the
// resolver exists.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CombatEvent } from '../../logic/combat/events'
import type { Row, Column, Side } from '../../logic/state/types'
import type { StatusKind } from '../../content/schema/status'
import { isModuleAction } from '../../logic/gambits/types'
import { getModuleDef } from '../../logic/content/moduleLoader'
import { type UnitInfo, type PlaybackSpeed, buildSchedule } from '../playback'
import { Vacuum } from '../units/Vacuum'
import { Butler } from '../units/Butler'
import { QaRig } from '../units/QaRig'
import { Overseer } from '../units/Overseer'
import { Lawnbot } from '../units/Lawnbot'
import { SecurityDrone } from '../units/SecurityDrone'
import { Swarmer } from '../units/Swarmer'
import { Siege } from '../units/Siege'
import styles from './CombatScene.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

interface Popup {
  id: string
  unitId: string
  amount: number
}

interface ProjectilePos {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface LogEntry {
  kind: 'round' | 'attack' | 'idle' | 'destroyed' | 'result' | 'status'
  text: string
}

export interface CombatSceneProps {
  units: UnitInfo[]
  events: CombatEvent[]
  speed: PlaybackSpeed
  /** If true, playback starts automatically on mount. */
  autoPlay?: boolean
  /** Called once when playback reaches the final event. */
  onComplete?: () => void
}

// ── Pure derivation helpers ───────────────────────────────────────────────────

function deriveHps(units: UnitInfo[], events: CombatEvent[], count: number): Map<string, number> {
  const hps = new Map(units.map(u => [u.id, u.hp]))
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'damage_dealt') {
      hps.set(e.targetId, Math.max(0, (hps.get(e.targetId) ?? 0) - e.amount))
    }
  }
  return hps
}

function deriveDestroyed(events: CombatEvent[], count: number): Set<string> {
  const s = new Set<string>()
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'unit_destroyed') s.add(e.unitId)
  }
  return s
}

/**
 * Per-unit active status counts. Each kind→count entry means there is at
 * least one active instance of that kind on the unit. The badge UI does
 * not render duration; expiry events remove one instance at a time.
 */
function deriveStatuses(
  events: CombatEvent[],
  count: number,
): Map<string, Map<StatusKind, number>> {
  const m = new Map<string, Map<StatusKind, number>>()
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'status_applied') {
      const sm = m.get(e.targetId) ?? new Map<StatusKind, number>()
      sm.set(e.statusKind, (sm.get(e.statusKind) ?? 0) + 1)
      m.set(e.targetId, sm)
    } else if (e.kind === 'status_expired') {
      const sm = m.get(e.unitId)
      if (sm) {
        const cur = sm.get(e.statusKind) ?? 0
        if (cur <= 1) sm.delete(e.statusKind)
        else sm.set(e.statusKind, cur - 1)
      }
    }
  }
  return m
}

/**
 * In-flight AoE action. Active between action_used (with > 1 targets) and the
 * next turn_ended. Used to apply a flash CSS class to the affected side.
 */
function deriveCurrentAoe(
  events: CombatEvent[],
  count: number,
): { sourceId: string; targetIds: string[] } | null {
  let pending: { sourceId: string; targetIds: string[] } | null = null
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'action_used' && e.targets.length > 1) {
      pending = { sourceId: e.unitId, targetIds: e.targets }
    } else if (e.kind === 'turn_ended') {
      pending = null
    }
  }
  return pending
}

function deriveWinner(events: CombatEvent[], count: number): 'player' | 'enemy' | null {
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'combat_ended') return e.winner
  }
  return null
}

/** Returns the ID of the unit whose turn is currently in progress. */
function deriveActiveUnit(events: CombatEvent[], count: number): string | null {
  let activeId: string | null = null
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'turn_started') activeId = e.unitId
    if (e.kind === 'turn_ended') activeId = null
  }
  return activeId
}

/** Returns the ID of the unit that chose idle this turn — cleared on turn_ended. */
function deriveIdleUnit(events: CombatEvent[], count: number): string | null {
  let idleId: string | null = null
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'turn_started') idleId = null
    if (e.kind === 'action_used' && e.action.kind === 'idle') idleId = e.unitId
    if (e.kind === 'turn_ended') idleId = null
  }
  return idleId
}

/**
 * Returns the attacker/target IDs during the action_used(attack) window
 * (i.e. after action_used but before the corresponding damage_dealt fires).
 * Returns null at all other times.
 */
function deriveCurrentAttack(
  events: CombatEvent[],
  count: number,
): { attackerId: string; targetId: string } | null {
  let pending: { attackerId: string; targetId: string } | null = null
  for (let i = 0; i < count; i++) {
    const e = events[i]
    // v0.8: AoE actions (targets.length > 1) use the side-flash visual instead of a single projectile.
    if (e.kind === 'action_used' && isModuleAction(e.action) && e.targets.length === 1) {
      pending = { attackerId: e.unitId, targetId: e.targets[0] }
    }
    if (e.kind === 'damage_dealt' || e.kind === 'turn_ended') pending = null
  }
  return pending
}

// ── Log helpers ───────────────────────────────────────────────────────────────

function chassisLabel(chassis: UnitInfo['chassis']): string {
  const labels: Record<UnitInfo['chassis'], string> = {
    vacuum: 'Vacuum',
    butler: 'Butler',
    'qa-rig': 'QA-Rig',
    overseer: 'Overseer',
    lawnbot: 'Lawnbot',
    security_drone: 'Security-drone',
    swarmer: 'Swarmer',
    siege: 'Siege',
  }
  return labels[chassis] ?? chassis
}

/** Build a stable display name for each unit (appends #N when chassis repeats). */
function buildNameMap(units: UnitInfo[]): Map<string, string> {
  const byLabel = new Map<string, UnitInfo[]>()
  for (const u of units) {
    const label = chassisLabel(u.chassis)
    if (!byLabel.has(label)) byLabel.set(label, [])
    byLabel.get(label)!.push(u)
  }
  const names = new Map<string, string>()
  for (const [label, group] of byLabel) {
    if (group.length === 1) {
      names.set(group[0].id, label)
    } else {
      const sorted = [...group].sort((a, b) => a.slot.column - b.slot.column)
      sorted.forEach((u, i) => names.set(u.id, `${label} #${i + 1}`))
    }
  }
  return names
}

function buildLogEntries(
  nameMap: Map<string, string>,
  events: CombatEvent[],
  count: number,
): LogEntry[] {
  const entries: LogEntry[] = []
  for (let i = 0; i < count; i++) {
    const e = events[i]
    if (e.kind === 'round_started') {
      entries.push({ kind: 'round', text: `Round ${e.round}` })
    } else if (e.kind === 'action_used') {
      const attackerName = nameMap.get(e.unitId) ?? e.unitId
      if (isModuleAction(e.action) && e.targets.length > 0) {
        const targetName = nameMap.get(e.targets[0]) ?? e.targets[0]
        // Look ahead within applied window for the damage amount.
        let dmgText = ''
        for (let j = i + 1; j < count && j <= i + 5; j++) {
          const ne = events[j]
          if (ne.kind === 'damage_dealt' && ne.targetId === e.targets[0]) {
            dmgText = ` (${ne.amount} dmg)`
            break
          }
          if (ne.kind === 'turn_ended') break
        }
        const attackName = getModuleDef(e.action.kind).name
        entries.push({
          kind: 'attack',
          text: `${attackerName} → ${attackName} → ${targetName}${dmgText}`,
        })
      } else if (e.action.kind === 'idle') {
        entries.push({ kind: 'idle', text: `${attackerName} → idle` })
      }
    } else if (e.kind === 'unit_destroyed') {
      const name = nameMap.get(e.unitId) ?? e.unitId
      entries.push({ kind: 'destroyed', text: `${name} destroyed` })
    } else if (e.kind === 'status_applied') {
      const tgtName = nameMap.get(e.targetId) ?? e.targetId
      entries.push({
        kind: 'status',
        text: `${tgtName} ← ${e.statusKind} (${e.duration}r)`,
      })
    } else if (e.kind === 'status_tick_damage') {
      const name = nameMap.get(e.unitId) ?? e.unitId
      entries.push({ kind: 'status', text: `${name} ${e.statusKind} tick (-${e.amount} HP)` })
    } else if (e.kind === 'status_expired') {
      const name = nameMap.get(e.unitId) ?? e.unitId
      entries.push({ kind: 'status', text: `${name} ${e.statusKind} expired` })
    } else if (e.kind === 'combat_ended') {
      entries.push({
        kind: 'result',
        text: e.winner === 'player' ? 'Player wins!' : 'Enemy wins!',
      })
    }
  }
  return entries
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ChassisComponent({ chassis }: { chassis: UnitInfo['chassis'] }) {
  switch (chassis) {
    case 'vacuum':
      return <Vacuum />
    case 'butler':
      return <Butler />
    case 'qa-rig':
      return <QaRig />
    case 'overseer':
      return <Overseer />
    case 'lawnbot':
      return <Lawnbot />
    case 'security_drone':
      return <SecurityDrone />
    case 'swarmer':
      return <Swarmer />
    case 'siege':
      return <Siege />
  }
}

interface SlotProps {
  unit?: UnitInfo
  hp: number
  destroyed: boolean
  popups: Popup[]
  active: boolean
  idle: boolean
  statuses?: Map<StatusKind, number>
}

const STATUS_ICON: Record<StatusKind, string> = {
  burning: '🔥',
  disabled: '⛔',
  damage_boost: '⚡',
}

function StatusBadges({ statuses }: { statuses?: Map<StatusKind, number> }) {
  if (!statuses || statuses.size === 0) return null
  const entries: Array<{ kind: StatusKind; count: number }> = []
  statuses.forEach((count, kind) => entries.push({ kind, count }))
  return (
    <div className={styles.statusBadges} data-testid="status-badges">
      {entries.map(({ kind, count }) => (
        <span
          key={kind}
          className={`${styles.statusBadge} ${styles[`status_${kind}` as const] ?? ''}`}
          data-status-kind={kind}
          title={`${kind}${count > 1 ? ` ×${count}` : ''}`}
        >
          {STATUS_ICON[kind]}
          {count > 1 && <span className={styles.statusCount}>{count}</span>}
        </span>
      ))}
    </div>
  )
}

function UnitSlot({ unit, hp, destroyed, popups, active, idle, statuses }: SlotProps) {
  if (!unit) return <div className={styles.emptySlot} />

  const hpPct = unit.maxHp > 0 ? Math.round((hp / unit.maxHp) * 100) : 0
  const hpFillClass = [
    styles.hpFill,
    hpPct <= 25 ? styles.hpCritical : hpPct <= 50 ? styles.hpLow : '',
  ]
    .filter(Boolean)
    .join(' ')

  const slotClass = [styles.slot, active ? styles.slotActive : ''].filter(Boolean).join(' ')

  return (
    <div className={slotClass} data-unit-id={unit.id}>
      {idle && <span className={styles.idleBadge}>…</span>}
      <StatusBadges statuses={statuses} />
      <div className={`${styles.unitWrapper}${destroyed ? ` ${styles.destroyed}` : ''}`}>
        <ChassisComponent chassis={unit.chassis} />
        {popups.map(p => (
          <div key={p.id} className={styles.damagePopup}>
            -{p.amount}
          </div>
        ))}
      </div>
      <div className={styles.hpBar}>
        <div className={hpFillClass} style={{ width: `${hpPct}%` }} />
      </div>
    </div>
  )
}

const COLS: Column[] = [0, 1, 2]

// Battlefield is laid out horizontally: player squad on the left, enemy on the
// right, facing each other across a centerline divider. So a slot's `row`
// (front / middle / back) maps to a *horizontal* position from the divider
// outward, and a slot's `column` (0..2) maps to a *vertical* position within
// each side's grid. The player side renders rows back → middle → front from
// left to right so the front line touches the divider; the enemy side mirrors
// that order so its front line also touches the divider.
const ROWS_PLAYER: Row[] = ['back', 'middle', 'front']
const ROWS_ENEMY: Row[] = ['front', 'middle', 'back']

interface SideGridProps {
  side: Side
  units: UnitInfo[]
  hps: Map<string, number>
  destroyed: Set<string>
  popups: Popup[]
  activeUnitId: string | null
  idleUnitId: string | null
  statuses: Map<string, Map<StatusKind, number>>
  /** When non-null, this side is the target of an in-flight AoE — apply flash. */
  aoeFlash: boolean
}

function SideGrid({
  side,
  units,
  hps,
  destroyed,
  popups,
  activeUnitId,
  idleUnitId,
  statuses,
  aoeFlash,
}: SideGridProps) {
  const rowOrder = side === 'player' ? ROWS_PLAYER : ROWS_ENEMY
  const gridClass = [styles.grid, aoeFlash ? styles.aoeFlash : ''].filter(Boolean).join(' ')
  return (
    <div className={gridClass} data-aoe-flash={aoeFlash ? 'true' : undefined}>
      {COLS.flatMap(col =>
        rowOrder.map(row => {
          const unit = units.find(u => u.slot.row === row && u.slot.column === col)
          const unitPopups = unit ? popups.filter(p => p.unitId === unit.id) : []
          return (
            <UnitSlot
              key={`${row}-${col}`}
              unit={unit}
              hp={unit ? (hps.get(unit.id) ?? unit.maxHp) : 0}
              destroyed={unit ? destroyed.has(unit.id) : false}
              popups={unitPopups}
              active={!!unit && unit.id === activeUnitId}
              idle={!!unit && unit.id === idleUnitId}
              statuses={unit ? statuses.get(unit.id) : undefined}
            />
          )
        }),
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function CombatScene({ units, events, speed, autoPlay, onComplete }: CombatSceneProps) {
  // How many events have been "applied" to the visual state.
  const [appliedCount, setAppliedCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [popups, setPopups] = useState<Popup[]>([])
  const [projectilePos, setProjectilePos] = useState<ProjectilePos | null>(null)

  // Mutable refs for the RAF loop — avoids stale-closure issues.
  const posMsRef = useRef(0)
  const appliedCountRef = useRef(0)
  const isPlayingRef = useRef(false)
  const lastTsRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const battlefieldRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Schedule is rebuilt whenever events or speed changes.
  const schedule = useMemo(() => buildSchedule(events, speed), [events, speed])
  const scheduleRef = useRef(schedule)

  // Keep scheduleRef current; when speed changes, snap posMs to the currently
  // applied position so playback continues from the right place.
  useEffect(() => {
    const newSched = buildSchedule(events, speed)
    scheduleRef.current = newSched
    const count = appliedCountRef.current
    if (count > 0 && count <= newSched.events.length) {
      posMsRef.current = newSched.events[count - 1].startMs + newSched.events[count - 1].durationMs
    }
  }, [events, speed])

  // ── Popup helpers ──────────────────────────────────────────────────────────

  const showPopups = useCallback((newPopups: Popup[]) => {
    if (newPopups.length === 0) return
    setPopups(p => [...p, ...newPopups])
    setTimeout(() => {
      setPopups(p => p.filter(pp => !newPopups.some(np => np.id === pp.id)))
    }, 900)
  }, [])

  // ── RAF tick ───────────────────────────────────────────────────────────────

  const tick = useCallback(
    (ts: number) => {
      if (!isPlayingRef.current) return

      const last = lastTsRef.current
      const sched = scheduleRef.current

      if (last !== null) {
        posMsRef.current = Math.min(sched.totalMs, posMsRef.current + (ts - last))
      }
      lastTsRef.current = ts

      const pos = posMsRef.current
      const prevCount = appliedCountRef.current
      let newCount = prevCount
      while (newCount < sched.events.length && sched.events[newCount].startMs <= pos) {
        newCount++
      }

      if (newCount !== prevCount) {
        const newPopups: Popup[] = []
        for (let i = prevCount; i < newCount; i++) {
          const ev = sched.events[i].event
          if (ev.kind === 'damage_dealt') {
            newPopups.push({
              id: `auto-${i}-${ts}`,
              unitId: ev.targetId,
              amount: ev.amount,
            })
          }
        }
        appliedCountRef.current = newCount
        setAppliedCount(newCount)
        showPopups(newPopups)
      }

      if (pos < sched.totalMs) {
        rafIdRef.current = requestAnimationFrame(tick)
      } else {
        isPlayingRef.current = false
        lastTsRef.current = null
        setIsPlaying(false)
        onComplete?.()
      }
    },
    [showPopups],
  )

  // ── Controls ───────────────────────────────────────────────────────────────

  const stopRaf = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    lastTsRef.current = null
  }, [])

  const play = useCallback(() => {
    // If we're at the end, replay from the start.
    if (appliedCountRef.current >= scheduleRef.current.events.length) {
      posMsRef.current = 0
      appliedCountRef.current = 0
      setAppliedCount(0)
      setPopups([])
    }
    isPlayingRef.current = true
    setIsPlaying(true)
    rafIdRef.current = requestAnimationFrame(tick)
  }, [tick])

  const pause = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    stopRaf()
  }, [stopRaf])

  const step = useCallback(() => {
    pause()
    const sched = scheduleRef.current
    const count = appliedCountRef.current
    if (count >= sched.events.length) return

    const se = sched.events[count]
    posMsRef.current = se.startMs + se.durationMs
    const newCount = count + 1
    appliedCountRef.current = newCount
    setAppliedCount(newCount)

    const ev = se.event
    if (ev.kind === 'damage_dealt') {
      showPopups([{ id: `step-${count}`, unitId: ev.targetId, amount: ev.amount }])
    }
  }, [pause, showPopups])

  // Cleanup on unmount.
  useEffect(() => stopRaf, [stopRaf])

  // Auto-play on mount when requested.
  useEffect(() => {
    if (autoPlay) play()
  }, []) // intentionally empty — only fires once on mount

  // ── Derived visual state ───────────────────────────────────────────────────

  const hps = useMemo(() => deriveHps(units, events, appliedCount), [units, events, appliedCount])
  const destroyedUnits = useMemo(
    () => deriveDestroyed(events, appliedCount),
    [events, appliedCount],
  )
  const winner = useMemo(() => deriveWinner(events, appliedCount), [events, appliedCount])
  const activeUnitId = useMemo(() => deriveActiveUnit(events, appliedCount), [events, appliedCount])
  const idleUnitId = useMemo(() => deriveIdleUnit(events, appliedCount), [events, appliedCount])
  const currentAttack = useMemo(
    () => deriveCurrentAttack(events, appliedCount),
    [events, appliedCount],
  )
  const statuses = useMemo(() => deriveStatuses(events, appliedCount), [events, appliedCount])
  const currentAoe = useMemo(() => deriveCurrentAoe(events, appliedCount), [events, appliedCount])
  const nameMap = useMemo(() => buildNameMap(units), [units])
  const logEntries = useMemo(
    () => buildLogEntries(nameMap, events, appliedCount),
    [nameMap, events, appliedCount],
  )

  const playerUnits = useMemo(() => units.filter(u => u.side === 'player'), [units])
  const enemyUnits = useMemo(() => units.filter(u => u.side === 'enemy'), [units])
  const isDone = appliedCount >= events.length

  // Determine which side is the AoE target by looking up any one target's side.
  const aoeTargetSide: Side | null = useMemo(() => {
    if (!currentAoe || currentAoe.targetIds.length === 0) return null
    const firstTarget = units.find(u => u.id === currentAoe.targetIds[0])
    return firstTarget?.side ?? null
  }, [currentAoe, units])

  // Compute projectile positions from DOM when an attack action fires.
  // The projectile is visible between action_used and damage_dealt.
  useEffect(() => {
    if (!currentAttack || !battlefieldRef.current) {
      setProjectilePos(null)
      return
    }
    const container = battlefieldRef.current
    const containerRect = container.getBoundingClientRect()
    const attackerEl = container.querySelector(`[data-unit-id="${currentAttack.attackerId}"]`)
    const targetEl = container.querySelector(`[data-unit-id="${currentAttack.targetId}"]`)
    if (!attackerEl || !targetEl) {
      setProjectilePos(null)
      return
    }
    const aRect = attackerEl.getBoundingClientRect()
    const tRect = targetEl.getBoundingClientRect()
    setProjectilePos({
      x1: aRect.left + aRect.width / 2 - containerRect.left,
      y1: aRect.top + aRect.height / 2 - containerRect.top,
      x2: tRect.left + tRect.width / 2 - containerRect.left,
      y2: tRect.top + tRect.height / 2 - containerRect.top,
    })
  }, [currentAttack])

  // Auto-scroll the log panel to the latest entry.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logEntries.length])

  // ── Render ─────────────────────────────────────────────────────────────────

  const logKindClass: Record<LogEntry['kind'], string> = {
    round: styles.logEntryRound,
    attack: styles.logEntryAttack,
    idle: styles.logEntryIdle,
    destroyed: styles.logEntryDestroyed,
    result: styles.logEntryResult,
    status: styles.logEntryStatus,
  }

  return (
    <div className={styles.scene}>
      {/* Left half: battlefield scales to fill this column */}
      <div className={styles.leftColumn}>
        <div className={styles.battlefieldContainer} ref={battlefieldRef}>
          <div className={styles.battlefield}>
            <SideGrid
              side="player"
              units={playerUnits}
              hps={hps}
              destroyed={destroyedUnits}
              popups={popups}
              activeUnitId={activeUnitId}
              idleUnitId={idleUnitId}
              statuses={statuses}
              aoeFlash={aoeTargetSide === 'player'}
            />
            <div className={styles.divider} />
            <SideGrid
              side="enemy"
              units={enemyUnits}
              hps={hps}
              destroyed={destroyedUnits}
              popups={popups}
              activeUnitId={activeUnitId}
              idleUnitId={idleUnitId}
              statuses={statuses}
              aoeFlash={aoeTargetSide === 'enemy'}
            />
          </div>
          {projectilePos && currentAttack && (
            <div
              key={`proj-${currentAttack.attackerId}-${appliedCount}`}
              className={styles.projectileDot}
              style={
                {
                  '--proj-duration': `${220 / speed}ms`,
                  '--proj-dx': `${projectilePos.x2 - projectilePos.x1}px`,
                  '--proj-dy': `${projectilePos.y2 - projectilePos.y1}px`,
                  left: `${projectilePos.x1}px`,
                  top: `${projectilePos.y1}px`,
                } as CSSProperties
              }
            />
          )}
        </div>

        {winner && (
          <div
            className={`${styles.winnerBanner}${winner === 'enemy' ? ` ${styles.enemyWins}` : ''}`}
          >
            {winner === 'player' ? 'PLAYER WINS' : 'ENEMY WINS'}
          </div>
        )}

        <div className={styles.controls}>
          <button className={styles.ctrlBtn} onClick={isPlaying ? pause : play}>
            {isDone ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
          </button>
          <button className={styles.ctrlBtn} onClick={step} disabled={isPlaying || isDone}>
            Step
          </button>
          <span className={styles.progress}>
            {appliedCount} / {events.length} events
          </span>
        </div>
      </div>

      {/* Right half: scrolling combat log */}
      <div className={styles.rightColumn}>
        <div className={styles.logPanel} ref={logRef}>
          {logEntries.length === 0 && <div className={styles.logEmpty}>Combat log</div>}
          {logEntries.map((entry, i) => (
            <div key={i} className={`${styles.logEntry} ${logKindClass[entry.kind]}`}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
