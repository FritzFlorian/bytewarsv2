// _DebugScene — dev-only page for visual inspection of the render layer.
//
// Reachable at /?debug=scene during `pnpm dev`.
// Dead-code-eliminated in production by Vite (import.meta.env.DEV guard in App.tsx).
//
// Plays the hand-written sample fixture through <CombatScene> at the selected
// speed. Use this to iterate on animations and layout before T-3.1 wires up
// the real logic API.

import { useState } from 'react'
import { CombatScene } from './CombatScene'
import { sampleUnits, sampleEvents } from './__fixtures__/sample'
import type { PlaybackSpeed } from '../playback'

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 10]

export function DebugScene() {
  const [speed, setSpeed] = useState<PlaybackSpeed>(1)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '2rem',
        gap: '1.25rem',
        fontFamily: 'monospace',
      }}
    >
      <h2 style={{ color: '#7eb8f0', margin: 0, letterSpacing: '0.1em' }}>_DebugScene</h2>
      <p style={{ color: '#506080', margin: 0, fontSize: '0.8rem' }}>
        sample fixture · {sampleEvents.length} events · 7 rounds · player wins
      </p>

      {/* Speed selector */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          color: '#6870a0',
          fontSize: '0.8rem',
        }}
      >
        <span>Speed:</span>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              background: speed === s ? '#253050' : '#111520',
              color: speed === s ? '#c8d0e0' : '#5060a0',
              border: `1px solid ${speed === s ? '#7eb8f0' : '#1e2840'}`,
              borderRadius: '4px',
              padding: '0.2rem 0.6rem',
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              transition: 'all 0.1s',
            }}
          >
            {s}×
          </button>
        ))}
      </div>

      <CombatScene units={sampleUnits} events={sampleEvents} speed={speed} />
    </div>
  )
}
