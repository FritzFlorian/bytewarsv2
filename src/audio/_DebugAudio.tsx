/**
 * Dev-only debug page for audio samples.
 * Access via: pnpm dev → http://localhost:5173/?debug=audio
 *
 * Each button triggers the sound synthesis once. The AudioContext is lazily
 * created on first interaction (browser requires a user gesture before audio
 * starts). The beat has a start/stop toggle since it loops continuously.
 */
import { useRef, useState } from 'react'
import { playAttack } from './attack'
import { playDamage } from './damage'
import { playDestroy } from './destroy'
import { startBeat } from './beat'
import { playWin } from './win'
import { playLose } from './lose'

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

  const rows: Array<{
    id: string
    description: string
    action: () => void
    toggle?: boolean
    active?: boolean
  }> = [
    {
      id: 'attack',
      description: 'noise burst + descending square sweep (~180ms)',
      action: () => playAttack(getCtx()),
    },
    {
      id: 'damage',
      description: 'low thud + metallic ping (~150ms)',
      action: () => playDamage(getCtx()),
    },
    {
      id: 'destroy',
      description: 'heavy noise burst + sawtooth power-down (~500ms)',
      action: () => playDestroy(getCtx()),
    },
    {
      id: 'beat',
      description: '118 BPM · kick / snare / hi-hat loop (looping)',
      action: toggleBeat,
      toggle: true,
      active: beatPlaying,
    },
    {
      id: 'win',
      description: 'ascending major arpeggio + held chord (~1.8s)',
      action: () => playWin(getCtx()),
    },
    {
      id: 'lose',
      description: 'descending minor phrase + low drone (~2.2s)',
      action: () => playLose(getCtx()),
    },
  ]

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h2>Audio debug</h2>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td style={{ padding: '0.5rem 1rem', minWidth: '6rem' }}>
                {row.id}
              </td>
              <td>
                <button onClick={row.action}>
                  {row.toggle ? (row.active ? '■ stop' : '▶ start') : '▶ play'}
                </button>
              </td>
              <td style={{ padding: '0.5rem 1rem', color: '#888' }}>
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
