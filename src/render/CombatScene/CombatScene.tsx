// CombatScene — render layer visual playback component.
//
// Takes a pre-resolved CombatEvent[] (from the logic layer or a hand-written
// fixture) and replays it visually with play / pause / step controls.
//
// This component does NOT import from src/logic/combat/resolver — it only
// consumes the CombatEvent type. The separation is intentional: the render
// layer can be developed and tested against hand-written fixtures before the
// resolver exists.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CombatEvent } from '../../logic/combat/events'
import type { Row, Column } from '../../logic/state/types'
import { type UnitInfo, type PlaybackSpeed, buildSchedule } from '../playback'
import { Vacuum } from '../units/Vacuum'
import { Butler } from '../units/Butler'
import { QaRig } from '../units/QaRig'
import styles from './CombatScene.module.css'

// ── Types ────────────────────────────────────────────────────────────────────

interface Popup {
  id: string
  unitId: string
  amount: number
}

export interface CombatSceneProps {
  units: UnitInfo[]
  events: CombatEvent[]
  speed: PlaybackSpeed
}

// ── Pure derivation helpers ───────────────────────────────────────────────────

function deriveHps(
  units: UnitInfo[],
  events: CombatEvent[],
  count: number,
): Map<string, number> {
  const hps = new Map(units.map(u => [u.id, u.maxHp]))
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

// ── Sub-components ───────────────────────────────────────────────────────────

function ChassisComponent({ chassis }: { chassis: UnitInfo['chassis'] }) {
  if (chassis === 'vacuum') return <Vacuum />
  if (chassis === 'butler') return <Butler />
  return <QaRig />
}

interface SlotProps {
  unit?: UnitInfo
  hp: number
  destroyed: boolean
  popups: Popup[]
}

function UnitSlot({ unit, hp, destroyed, popups }: SlotProps) {
  if (!unit) return <div className={styles.emptySlot} />

  const hpPct = unit.maxHp > 0 ? Math.round((hp / unit.maxHp) * 100) : 0
  const hpFillClass = [
    styles.hpFill,
    hpPct <= 25 ? styles.hpCritical : hpPct <= 50 ? styles.hpLow : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.slot}>
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
}

function SideGrid({ units, hps, destroyed, popups }: SideGridProps) {
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
            />
          )
        }),
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function CombatScene({ units, events, speed }: CombatSceneProps) {
  // How many events have been "applied" to the visual state.
  const [appliedCount, setAppliedCount] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [popups, setPopups] = useState<Popup[]>([])

  // Mutable refs for the RAF loop — avoids stale-closure issues.
  const posMsRef = useRef(0)
  const appliedCountRef = useRef(0)
  const isPlayingRef = useRef(false)
  const lastTsRef = useRef<number | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Schedule is rebuilt whenever events or speed changes.
  const schedule = useMemo(() => buildSchedule(events, speed), [events, speed])
  const scheduleRef = useRef(schedule)

  // Keep scheduleRef current; when speed changes, snap posMs to the currently
  // applied position so playback continues from the right place.
  useEffect(() => {
    const newSched = buildSchedule(events, speed)
    scheduleRef.current = newSched
    // Snap posMs to where we are in the new schedule.
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

  const playerUnits = useMemo(() => units.filter(u => u.side === 'player'), [units])
  const enemyUnits = useMemo(() => units.filter(u => u.side === 'enemy'), [units])
  const isDone = appliedCount >= events.length

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.scene}>
      <div className={styles.battlefield}>
        <SideGrid
          units={playerUnits}
          hps={hps}
          destroyed={destroyedUnits}
          popups={popups}
        />
        <div className={styles.divider} />
        <SideGrid
          units={enemyUnits}
          hps={hps}
          destroyed={destroyedUnits}
          popups={popups}
        />
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
  )
}
