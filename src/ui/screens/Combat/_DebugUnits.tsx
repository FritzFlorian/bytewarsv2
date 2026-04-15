// Dev-only debug page — renders every chassis side-by-side at slot size
// for visual review. Accessible at /?debug in development (import.meta.env.DEV).
//
// Acceptance guardrail (T-2C.1, carried through T-6.4–T-6.7):
//   "silhouettes pass the 'tell apart in solid black' check"
// Manually confirm by inspecting the screenshots produced by pnpm e2e.

import { Vacuum } from '../../../render/units/Vacuum'
import { Butler } from '../../../render/units/Butler'
import { QaRig } from '../../../render/units/QaRig'
import { Overseer } from '../../../render/units/Overseer'
import { Lawnbot } from '../../../render/units/Lawnbot'
import { SecurityDrone } from '../../../render/units/SecurityDrone'
import { Swarmer } from '../../../render/units/Swarmer'
import { Siege } from '../../../render/units/Siege'

// Stage background from art-style-samples.html column B
const STAGE_BG = 'linear-gradient(180deg, #3b3250 0%, #5a3a52 100%)'

// Slot size matches CombatScreen layout (5rem × 5rem = 80px); widened on the
// Siege row since the siege silhouette exceeds the standard slot.
const SLOT_SIZE = 80
const SLOT_SIZE_LARGE = 120

interface SlotProps {
  label: string
  size?: number
  children: React.ReactNode
}

function Slot({ label, size = SLOT_SIZE, children }: SlotProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          background: STAGE_BG,
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {children}
      </div>
      <span
        style={{ color: '#8a93a6', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.06em' }}
      >
        {label}
      </span>
    </div>
  )
}

export function DebugUnits() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a1d24',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        padding: 40,
        fontFamily: 'monospace',
      }}
    >
      <h2 style={{ margin: 0, color: '#e6e8ee', fontSize: 14, letterSpacing: '0.1em' }}>
        UNIT CHASSIS — DEBUG VIEW
      </h2>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Slot label="vacuum-class">
          <Vacuum />
        </Slot>
        <Slot label="butler-class">
          <Butler />
        </Slot>
        <Slot label="lawnbot-class">
          <Lawnbot />
        </Slot>
        <Slot label="security-drone">
          <SecurityDrone />
        </Slot>
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <Slot label="qa-rig (enemy)">
          <QaRig />
        </Slot>
        <Slot label="swarmer (enemy)">
          <Swarmer />
        </Slot>
        <Slot label="siege (elite)" size={SLOT_SIZE_LARGE}>
          <Siege />
        </Slot>
        <Slot label="overseer (boss)" size={SLOT_SIZE_LARGE}>
          <Overseer />
        </Slot>
      </div>

      <p style={{ margin: 0, color: '#4a5268', fontSize: 11, maxWidth: 520, textAlign: 'center' }}>
        dev only · silhouette check: every chassis must be distinguishable in solid black · style:
        column B
      </p>
    </div>
  )
}
