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
import type { Row, Column } from '../../logic/state/types'
import { type UnitInfo, type PlaybackSpeed, buildSchedule } from '../playback'
import { Vacuum } from '../units/Vacuum'
import { Butler } from '../units/Butler'
import { QaRig } from '../units/QaRig'
import { Overseer } from '../units/Overseer'
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
  kind: 'round' | 'attack' | 'idle' | 'destroyed' | 'result'
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

function deriveHps(
  units: UnitInfo[],
  events: CombatEvent[],
  count: number,
): Map<string, number> {
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

function deriveWinner(
  events: CombatEvent[],
  count: number,
): 'player' | 'enemy' | null {
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
    if (e.kind === 'action_used' && e.action.kind === 'attack' && e.targets.length > 0) {
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
      if (e.action.kind === 'attack' && e.targets.length > 0) {
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
        entries.push({ kind: 'attack', text: `${attackerName} → attack → ${targetName}${dmgText}` })
      } else if (e.action.kind === 'idle') {
        entries.push({ kind: 'idle', text: `${attackerName} → idle` })
      }
    } else if (e.kind === 'unit_destroyed') {
      const name = nameMap.get(e.unitId) ?? e.unitId
      entries.push({ kind: 'destroyed', text: `${name} destroyed` })
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
  if (chassis === 'vacuum') return <Vacuum />
  if (chassis === 'butler') return <Butler />
  if (chassis === 'overseer') return <Overseer />
  return <QaRig />
}

interface SlotProps {
  unit?: UnitInfo
  hp: number
  destroyed: boolean
  popups: Popup[]
  active: boolean
  idle: boolean
}

function UnitSlot({ unit, hp, destroyed, popups, active, idle }: SlotProps) {
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

const ROWS: Row[] = ['front', 'middle', 'back']
const COLS: Column[] = [0, 1, 2]

interface SideGridProps {
  units: UnitInfo[]
  hps: Map<string, number>
  destroyed: Set<string>
  popups: Popup[]
  activeUnitId: string | null
  idleUnitId: string | null
}

function SideGrid({ units, hps, destroyed, popups, activeUnitId, idleUnitId }: SideGridProps) {
  return (
    <div className={styles.grid}>
      {ROWS.flatMap(row =>
        COLS.map(col => {
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
      while (
        newCount < sched.events.length &&
        sched.events[newCount].startMs <= pos
      ) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — only fires once on mount

  // ── Derived visual state ───────────────────────────────────────────────────

  const hps = useMemo(
    () => deriveHps(units, events, appliedCount),
    [units, events, appliedCount],
  )
  const destroyedUnits = useMemo(
    () => deriveDestroyed(events, appliedCount),
    [events, appliedCount],
  )
  const winner = useMemo(
    () => deriveWinner(events, appliedCount),
    [events, appliedCount],
  )
  const activeUnitId = useMemo(
    () => deriveActiveUnit(events, appliedCount),
    [events, appliedCount],
  )
  const idleUnitId = useMemo(
    () => deriveIdleUnit(events, appliedCount),
    [events, appliedCount],
  )
  const currentAttack = useMemo(
    () => deriveCurrentAttack(events, appliedCount),
    [events, appliedCount],
  )
  const nameMap = useMemo(() => buildNameMap(units), [units])
  const logEntries = useMemo(
    () => buildLogEntries(nameMap, events, appliedCount),
    [nameMap, events, appliedCount],
  )

  const playerUnits = useMemo(() => units.filter(u => u.side === 'player'), [units])
  const enemyUnits = useMemo(() => units.filter(u => u.side === 'enemy'), [units])
  const isDone = appliedCount >= events.length

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
  }

  return (
    <div className={styles.scene}>
      {/* Left half: battlefield scales to fill this column */}
      <div className={styles.leftColumn}>
        <div className={styles.battlefieldContainer} ref={battlefieldRef}>
          <div className={styles.battlefield}>
            <SideGrid
              units={playerUnits}
              hps={hps}
              destroyed={destroyedUnits}
              popups={popups}
              activeUnitId={activeUnitId}
              idleUnitId={idleUnitId}
            />
            <div className={styles.divider} />
            <SideGrid
              units={enemyUnits}
              hps={hps}
              destroyed={destroyedUnits}
              popups={popups}
              activeUnitId={activeUnitId}
              idleUnitId={idleUnitId}
            />
          </div>
          {projectilePos && currentAttack && (
            <div
              key={`proj-${currentAttack.attackerId}-${appliedCount}`}
              className={styles.projectileDot}
              style={{
                '--proj-duration': `${220 / speed}ms`,
                '--proj-dx': `${projectilePos.x2 - projectilePos.x1}px`,
                '--proj-dy': `${projectilePos.y2 - projectilePos.y1}px`,
                left: `${projectilePos.x1}px`,
                top: `${projectilePos.y1}px`,
              } as CSSProperties}
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
          <button
            className={styles.ctrlBtn}
            onClick={step}
            disabled={isPlaying || isDone}
          >
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
          {logEntries.length === 0 && (
            <div className={styles.logEmpty}>Combat log</div>
          )}
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
