// @vitest-environment jsdom
//
// Audio drift guards.
//
// Compile-time: SOUND_DISPATCH is typed `Record<SoundId, ...>`, so TypeScript
// already blocks a new SoundId from landing without a synthesis entry. These
// tests cover the runtime contracts that the type system can't:
//
//   1. Every attack in attacks.json resolves to a SOUND_DISPATCH entry
//      (i.e. nothing in the content data points at a SoundId that was
//      later removed or renamed).
//   2. The audio debug page renders a row for every SoundId, so newly
//      added sounds are always auditionable without a second edit.
//   3. DEBUG_AUDIO_ORDER is in sync with SOUND_DISPATCH (no missing or
//      extra IDs in the debug page's render list).

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { DebugAudio, DEBUG_AUDIO_ORDER } from '../../src/audio/_DebugAudio'
import { SOUND_DISPATCH } from '../../src/audio/dispatch'
import type { SoundId } from '../../src/audio/sounds'
import { getAllAttacks } from '../../src/logic'

afterEach(() => cleanup())

describe('audio drift guards', () => {
  it('every attack.sound in attacks.json has a SOUND_DISPATCH entry', () => {
    for (const attack of getAllAttacks()) {
      expect(SOUND_DISPATCH, `attack ${attack.id} references sound ${attack.sound}`).toHaveProperty(
        attack.sound,
      )
      expect(typeof SOUND_DISPATCH[attack.sound].play).toBe('function')
    }
  })

  it('DEBUG_AUDIO_ORDER lists exactly the SoundIds in SOUND_DISPATCH', () => {
    const dispatchKeys = (Object.keys(SOUND_DISPATCH) as SoundId[]).sort()
    const orderKeys = [...DEBUG_AUDIO_ORDER].sort()
    expect(orderKeys).toEqual(dispatchKeys)
  })

  it('renders a debug row for every SoundId in SOUND_DISPATCH', () => {
    render(<DebugAudio />)
    for (const id of Object.keys(SOUND_DISPATCH) as SoundId[]) {
      expect(screen.getByTestId(`audio-row-${id}`), `missing row for ${id}`).toBeTruthy()
    }
  })
})
