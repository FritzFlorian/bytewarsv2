// Playback engine: converts a CombatEvent[] into a timed schedule.
//
// The schedule assigns a wall-clock timestamp (ms from start) to each event,
// scaled by the current playback speed. Consumers advance through the schedule
// by comparing elapsed time to each event's startMs.
//
// Speed is applied by dividing all base durations: at 2× speed, a 400 ms event
// takes 200 ms; at 0.5× it takes 800 ms.

import type { UnitId, Side, SlotRef, Chassis } from '../logic/state/types'
import type { CombatEvent } from '../logic/combat/events'

export type PlaybackSpeed = 0.5 | 1 | 2 | 10

// Information the render layer needs to display a unit (subset of logic's Unit).
// Defined here so callers don't have to import from src/logic directly.
export interface UnitInfo {
  id: UnitId
  side: Side
  slot: SlotRef
  hp: number
  maxHp: number
  chassis: Chassis
}

export interface ScheduledEvent {
  event: CombatEvent
  /** Wall-clock ms from playback start (already speed-adjusted). */
  startMs: number
  /** How long this event's visual effect lasts (speed-adjusted). */
  durationMs: number
}

export interface PlaybackSchedule {
  events: ScheduledEvent[]
  /** Total duration of the schedule in ms (speed-adjusted). */
  totalMs: number
}

// Base duration per event kind at 1× speed.
// Events with 0 duration fire instantly (informational, no visual pause).
const BASE_DURATION_MS: Record<CombatEvent['kind'], number> = {
  round_started: 350,
  turn_started: 60,
  rule_fired: 0,
  action_used: 220,
  damage_dealt: 450,
  unit_destroyed: 600,
  turn_ended: 60,
  round_ended: 280,
  combat_ended: 700,
}

export function buildSchedule(
  events: CombatEvent[],
  speed: PlaybackSpeed,
): PlaybackSchedule {
  const scheduled: ScheduledEvent[] = []
  let cursor = 0

  for (const event of events) {
    const durationMs = BASE_DURATION_MS[event.kind] / speed
    scheduled.push({ event, startMs: cursor, durationMs })
    cursor += durationMs
  }

  return { events: scheduled, totalMs: cursor }
}
