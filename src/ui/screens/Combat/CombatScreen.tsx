// Combat screen — v0.3.
//
// Receives pre-resolved units and events from App (computed by the gambit
// editor's Run action). Immediately renders CombatScene with autoPlay so
// the fight begins without further user interaction.
//
// Audio (v0.3): the background beat starts on mount and audio cues are
// scheduled via setTimeout in sync with buildSchedule() timing. When the
// user changes playback speed, pending timers are cancelled and rescheduled
// from the current position in the new schedule.
//
// Audio is triggered here, not inside CombatScene — the render layer stays
// audio-free per the architecture rules.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CombatEvent } from '../../../logic'
import { buildSchedule } from '../../../render/playback'
import type { PlaybackSpeed } from '../../../render/playback'
import { playSound, startMusic } from '../../../audio/engine'
import { CombatScene } from '../../../render/CombatScene'
import type { UnitInfo } from '../../../render/CombatScene'
import styles from './CombatScreen.module.css'

export interface CombatScreenProps {
  units: UnitInfo[]
  events: CombatEvent[]
  /** Called when the player clicks "Continue" after combat finishes. */
  onContinue?: () => void
}

export function CombatScreen({ units, events, onContinue }: CombatScreenProps) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)
  const [combatDone, setCombatDone] = useState(false)

  const handleComplete = useCallback(() => {
    setCombatDone(true)
  }, [])

  // Audio state — kept in refs to avoid spurious re-renders.
  const wallStartRef = useRef(0)       // Date.now() when playback began
  const stopBeatRef = useRef<(() => void) | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const speedRef = useRef<PlaybackSpeed>(1)

  function clearTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  /**
   * Schedule audio cues for events[fromEventIndex..] relative to wallStart.
   * Uses a pre-built schedule at the given speed.
   */
  function scheduleAudio(
    fromEventIndex: number,
    wallStart: number,
    spd: PlaybackSpeed,
  ) {
    clearTimers()
    const sched = buildSchedule(events, spd)
    const now = Date.now()
    const timers: ReturnType<typeof setTimeout>[] = []

    for (let i = fromEventIndex; i < sched.events.length; i++) {
      const se = sched.events[i]
      const ev = se.event
      const delayMs = Math.max(0, wallStart + se.startMs - now)

      if (ev.kind === 'action_used' && ev.action.kind === 'attack') {
        timers.push(setTimeout(() => playSound('attack'), delayMs))
      } else if (ev.kind === 'damage_dealt') {
        timers.push(setTimeout(() => playSound('damage'), delayMs))
      } else if (ev.kind === 'unit_destroyed') {
        timers.push(setTimeout(() => playSound('destroy'), delayMs))
      } else if (ev.kind === 'combat_ended') {
        const winner = ev.winner
        timers.push(
          setTimeout(() => {
            stopBeatRef.current?.()
            stopBeatRef.current = null
            playSound(winner === 'player' ? 'win' : 'lose')
          }, delayMs),
        )
      }
    }

    timersRef.current = timers
  }

  // On mount: start the beat and schedule all audio cues from t=0.
  useEffect(() => {
    const t0 = Date.now()
    wallStartRef.current = t0
    speedRef.current = 1
    stopBeatRef.current = startMusic()
    scheduleAudio(0, t0, 1)

    return () => {
      stopBeatRef.current?.()
      stopBeatRef.current = null
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — fires once on mount

  // On speed change: cancel pending timers and reschedule remaining events
  // from the current playback position mapped into the new speed's schedule.
  useEffect(() => {
    if (speedRef.current === speed) return // skip the initial mount run

    const now = Date.now()
    const elapsed = now - wallStartRef.current

    // Find which event index we've reached in the OLD schedule.
    const oldSched = buildSchedule(events, speedRef.current)
    let fromIndex = 0
    while (
      fromIndex < oldSched.events.length &&
      oldSched.events[fromIndex].startMs <= elapsed
    ) {
      fromIndex++
    }

    // Compute the schedule position we're at in the NEW schedule so we can
    // set a new wallStart that makes future timers fire at the right time.
    const newSched = buildSchedule(events, speed)
    const clampedIdx = Math.min(fromIndex, newSched.events.length - 1)
    const posInNewSched =
      fromIndex === 0
        ? 0
        : newSched.events[clampedIdx > 0 ? clampedIdx - 1 : 0].startMs +
          newSched.events[clampedIdx > 0 ? clampedIdx - 1 : 0].durationMs
    const newWallStart = now - posInNewSched

    wallStartRef.current = newWallStart
    speedRef.current = speed
    scheduleAudio(fromIndex, newWallStart, speed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed])

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bytewars</h1>
        <select
          className={styles.speedSelect}
          value={speed}
          onChange={e => setSpeed(Number(e.target.value) as PlaybackSpeed)}
        >
          <option value={0.5}>0.5×</option>
          <option value={1}>1×</option>
          <option value={2}>2×</option>
          <option value={10}>10×</option>
        </select>
      </header>

      <CombatScene units={units} events={events} speed={speed} autoPlay onComplete={handleComplete} />
      {combatDone && onContinue && (
        <div style={{ padding: '0 0 0.5rem 0' }}>
          <button className={styles.continueButton} onClick={onContinue}>
            Continue →
          </button>
        </div>
      )}
    </div>
  )
}
