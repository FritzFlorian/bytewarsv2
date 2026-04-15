/**
 * Dev-only debug page for audio samples.
 * Access via: pnpm dev → http://localhost:5173/?debug=audio
 *
 * Each button triggers the sound synthesis once. The AudioContext is lazily
 * created on first interaction (browser requires a user gesture before audio
 * starts). The beat has a start/stop toggle since it loops continuously.
 *
 * Rows are derived from SOUND_DISPATCH in dispatch.ts so this page always
 * shows every SoundId — adding a new sound automatically surfaces here.
 */
import { useRef, useState } from 'react'
import type { SoundId } from './sounds'
import { SOUND_DISPATCH } from './dispatch'
import { startBeat } from './beat'

// Render order for the debug page. Listed explicitly so the UI groups related
// sounds together (attacks by chassis, then system sounds, then the looping
// beat last). A test asserts this list matches every SoundId in SOUND_DISPATCH.
export const DEBUG_AUDIO_ORDER: SoundId[] = [
  'quick_jab',
  'sweep',
  'taser',
  'overload',
  'clamp',
  'suppression',
  'mow',
  'bash',
  'dart',
  'pulse_shot',
  'bite',
  'siege_cannon',
  'damage',
  'destroy',
  'win',
  'lose',
  'beat',
]

export function DebugAudio() {
  const ctxRef = useRef<AudioContext | null>(null)
  const stopBeatRef = useRef<(() => void) | null>(null)
  const [beatPlaying, setBeatPlaying] = useState(false)

  function getCtx(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    return ctxRef.current
  }

  function toggleBeat() {
    if (beatPlaying) {
      stopBeatRef.current?.()
      stopBeatRef.current = null
      setBeatPlaying(false)
    } else {
      stopBeatRef.current = startBeat(getCtx())
      setBeatPlaying(true)
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2>Audio debug</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {DEBUG_AUDIO_ORDER.map(id => {
            const entry = SOUND_DISPATCH[id]
            const isBeat = id === 'beat'
            return (
              <tr key={id} data-testid={`audio-row-${id}`}>
                <td style={{ padding: '0.5rem 1rem', minWidth: '6rem' }}>{id}</td>
                <td>
                  <button onClick={isBeat ? toggleBeat : () => entry.play(getCtx())}>
                    {isBeat ? (beatPlaying ? '■ stop' : '▶ start') : '▶ play'}
                  </button>
                </td>
                <td style={{ padding: '0.5rem 1rem', color: '#888' }}>{entry.description}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
