// Always-on chassis overview. Renders every chassis with its base stats
// (HP / rule slots / active slots / passive slots) and availability — modules
// are chassis-agnostic since v0.7, so per-chassis attack rosters were dropped.
// Reachable at /?preview=chassis and consumed by the /refresh-readme skill to
// regenerate README assets.

import type { Chassis } from '../../../logic'
import { getChassisDef } from '../../../logic'
import { Vacuum } from '../../../render/units/Vacuum'
import { Butler } from '../../../render/units/Butler'
import { QaRig } from '../../../render/units/QaRig'
import { Overseer } from '../../../render/units/Overseer'
import { Lawnbot } from '../../../render/units/Lawnbot'
import { SecurityDrone } from '../../../render/units/SecurityDrone'
import { Swarmer } from '../../../render/units/Swarmer'
import { Siege } from '../../../render/units/Siege'

type ChassisEntry = {
  chassis: Chassis
  label: string
  Component: React.ComponentType
}

// Kept in sync with the Chassis union in src/logic/state/types.ts. The unit
// test asserts that every member of the union is represented here.
export const CHASSIS_ENTRIES: ChassisEntry[] = [
  { chassis: 'vacuum', label: 'Vacuum', Component: Vacuum },
  { chassis: 'butler', label: 'Butler', Component: Butler },
  { chassis: 'qa-rig', label: 'QA-Rig', Component: QaRig },
  { chassis: 'overseer', label: 'Overseer', Component: Overseer },
  { chassis: 'lawnbot', label: 'Lawnbot', Component: Lawnbot },
  { chassis: 'security_drone', label: 'Security-drone', Component: SecurityDrone },
  { chassis: 'swarmer', label: 'Swarmer', Component: Swarmer },
  { chassis: 'siege', label: 'Siege', Component: Siege },
]

const STAGE_BG = 'linear-gradient(180deg, #3b3250 0%, #5a3a52 100%)'
const SLOT_SIZE = 120

const availabilityLabel: Record<'player' | 'enemy' | 'both', string> = {
  player: 'Player',
  enemy: 'Enemy',
  both: 'Both',
}

const availabilityColor: Record<'player' | 'enemy' | 'both', string> = {
  player: '#5fb6ff',
  enemy: '#ff7a7a',
  both: '#b888ff',
}

function ChassisCard({ entry }: { entry: ChassisEntry }) {
  const def = getChassisDef(entry.chassis)
  const stats: Array<[string, number]> = [
    ['Base HP', def.baseHp],
    ['Rule slots', def.baseRuleSlots],
    ['Active slots', def.activeSlots],
    ['Passive slots', def.passiveSlots],
  ]
  return (
    <div
      data-testid={`chassis-card-${entry.chassis}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 18,
        background: '#22262f',
        borderRadius: 8,
        border: '1px solid #2f3441',
        minWidth: 320,
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div
          style={{
            width: SLOT_SIZE,
            height: SLOT_SIZE,
            background: STAGE_BG,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'visible',
            flexShrink: 0,
          }}
        >
          <entry.Component />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ color: '#e6e8ee', fontSize: 16, fontWeight: 600 }}>{entry.label}</span>
          <span style={{ color: '#8a93a6', fontFamily: 'monospace', fontSize: 11 }}>
            {entry.chassis}
          </span>
          <span
            data-testid={`chassis-availability-${entry.chassis}`}
            style={{
              color: availabilityColor[def.availability],
              fontFamily: 'monospace',
              fontSize: 11,
              marginTop: 4,
              letterSpacing: '0.06em',
            }}
          >
            {availabilityLabel[def.availability].toUpperCase()}
          </span>
        </div>
      </div>

      <table
        data-testid={`chassis-stats-${entry.chassis}`}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#c6cad4',
        }}
      >
        <tbody>
          {stats.map(([label, value]) => (
            <tr
              key={label}
              data-testid={`stat-row-${entry.chassis}-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <td style={{ padding: '4px 8px 4px 0', color: '#8a93a6' }}>{label}</td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ChassisPreview() {
  return (
    <div
      data-testid="chassis-preview"
      style={{
        minHeight: '100vh',
        background: '#1a1d24',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        padding: 40,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <h1 style={{ margin: 0, color: '#e6e8ee', fontSize: 20, letterSpacing: '0.08em' }}>
          CHASSIS OVERVIEW
        </h1>
        <p style={{ margin: 0, color: '#6b7488', fontSize: 12 }}>
          Modules are chassis-agnostic. A chassis defines silhouette, side availability, and slot
          counts.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(320px, 1fr))',
          gap: 20,
          maxWidth: 900,
          width: '100%',
        }}
      >
        {CHASSIS_ENTRIES.map(e => (
          <ChassisCard key={e.chassis} entry={e} />
        ))}
      </div>
    </div>
  )
}
