// Dev-only debug page — renders all three chassis side-by-side at slot size
// for visual review. Accessible at /?debug in development (import.meta.env.DEV).
//
// T-2C.1 acceptance: "silhouettes pass the 'tell apart in solid black' check"
// — manually confirm by inspecting the screenshot produced by pnpm e2e.

import { Vacuum } from '../../../render/units/Vacuum'
import { Butler } from '../../../render/units/Butler'
import { QaRig } from '../../../render/units/QaRig'

// Stage background from art-style-samples.html column B
const STAGE_BG = 'linear-gradient(180deg, #3b3250 0%, #5a3a52 100%)'

// Slot size matches CombatScreen layout (5rem × 5rem = 80px)
const SLOT_SIZE = 80

interface SlotProps {
  label: string
  children: React.ReactNode
}

function Slot({ label, children }: SlotProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
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
        gap: 40,
        padding: 40,
        fontFamily: 'monospace',
      }}
    >
      <h2 style={{ margin: 0, color: '#e6e8ee', fontSize: 14, letterSpacing: '0.1em' }}>
        UNIT CHASSIS — DEBUG VIEW
      </h2>

      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-end' }}>
        <Slot label="vacuum-class">
          <Vacuum />
        </Slot>
        <Slot label="butler-class">
          <Butler />
        </Slot>
        <Slot label="qa-rig (enemy)">
          <QaRig />
        </Slot>
      </div>

      <p style={{ margin: 0, color: '#4a5268', fontSize: 11, maxWidth: 480, textAlign: 'center' }}>
        dev only · silhouette check: all three must be distinguishable in solid black · style:
        column B
      </p>
    </div>
  )
}
