/**
 * Sound dispatch registry — single source of truth mapping every SoundId to
 * its synthesis function.
 *
 * Why a Record<SoundId, ...>:
 *   - Adding a new SoundId to src/audio/sounds.ts without wiring it here is
 *     a TypeScript error. This is the drift guard for "every new attack
 *     must have a sound" — attack.sound is typed as AttackId ⊂ SoundId, so
 *     coverage for attacks falls out of exhaustive SoundId coverage.
 *   - `engine.ts` (one-shot playback) and `_DebugAudio.tsx` (the audition
 *     page) both consume this registry, so they never drift from each other.
 *
 * `beat` is a no-op here because the looping beat is managed via startMusic()
 * in engine.ts, not as a one-shot sound. It still needs an entry so the
 * Record stays exhaustive.
 */

import type { SoundId } from './sounds'
import { playQuickJab } from './quickJab'
import { playSweep } from './sweep'
import { playTaser } from './taser'
import { playOverload } from './overload'
import { playClamp } from './clamp'
import { playSuppression } from './suppression'
import { playMow } from './mow'
import { playBash } from './bash'
import { playDart } from './dart'
import { playPulseShot } from './pulseShot'
import { playBite } from './bite'
import { playSiegeCannon } from './siegeCannon'
import { playDamage } from './damage'
import { playDestroy } from './destroy'
import { playWin } from './win'
import { playLose } from './lose'

export interface SoundEntry {
  /** One-shot synthesis. Beat uses a no-op; see module comment. */
  play: (ctx: AudioContext) => void
  /** Human-readable description shown on the audio debug page. */
  description: string
}

export const SOUND_DISPATCH: Record<SoundId, SoundEntry> = {
  quick_jab: {
    play: playQuickJab,
    description: 'vacuum · metallic "tink" — three inharmonic sine partials (~160ms)',
  },
  sweep: {
    play: playSweep,
    description: 'vacuum · rotating brush — brown noise, 8 Hz AM, opening LPF (~520ms)',
  },
  taser: {
    play: playTaser,
    description: 'butler · chaotic arc — randomized square blips + HP noise (~260ms)',
  },
  overload: {
    play: playOverload,
    description: 'butler · two-tone alarm siren + noise pop + sub thud (~820ms)',
  },
  clamp: {
    play: playClamp,
    description: 'qa-rig · servo whirr descending + two hard clunks (~520ms)',
  },
  suppression: {
    play: playSuppression,
    description: 'overseer · formant-filtered saw + sub drone, vowel-like drift (~720ms)',
  },
  mow: {
    play: playMow,
    description: 'lawnbot · 2-stroke engine — jittered saw, 22 Hz AM, nasal rasp (~600ms)',
  },
  bash: {
    play: playBash,
    description: 'lawnbot · wooden thunk — LP noise whack + triangle drop, no ring (~260ms)',
  },
  dart: {
    play: playDart,
    description: 'security-drone · air swoosh → hollow tonk, two clear phases (~230ms)',
  },
  pulse_shot: {
    play: playPulseShot,
    description: 'security-drone · charge chirp + ring-modulated blaster pew (~500ms)',
  },
  bite: {
    play: playBite,
    description: 'swarmer · rising "brrrip" — 10 bandpassed clicks + wet tail (~260ms)',
  },
  siege_cannon: {
    play: playSiegeCannon,
    description: 'siege · ka-chunk, blast + deep sub, muffled slap-back echo (~1500ms)',
  },
  damage: {
    play: playDamage,
    description: 'low thud + metallic ping (~150ms)',
  },
  destroy: {
    play: playDestroy,
    description: 'heavy noise burst + sawtooth power-down (~500ms)',
  },
  win: {
    play: playWin,
    description: 'ascending major arpeggio + held chord (~1.8s)',
  },
  lose: {
    play: playLose,
    description: 'descending minor phrase + low drone (~2.2s)',
  },
  beat: {
    // Looping track — managed via startMusic() / the returned stop function.
    // This one-shot entry is intentionally a no-op; DebugAudio renders a
    // start/stop toggle instead of calling .play for beat.
    play: () => {},
    description: '118 BPM · kick / snare / hi-hat loop (looping)',
  },
}
