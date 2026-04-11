// v0.2: GambitEditorScreen is the landing page.
// "Run" navigates to CombatScreen (wired fully in T-1.4).
//
// Dev-only debug pages are gated behind import.meta.env.DEV. Vite replaces
// that constant with `false` in production builds, so the branches are
// dead-code-eliminated and the debug imports are tree-shaken out.

import { useState } from 'react'
import { GambitEditorScreen } from './screens/GambitEditor/GambitEditorScreen'
import { CombatScreen } from './screens/Combat/CombatScreen'
import { DebugUnits } from './screens/Combat/_DebugUnits'
import { DebugScene } from '../render/CombatScene'

type Screen = 'editor' | 'combat'

export default function App() {
  const [screen, setScreen] = useState<Screen>('editor')

  if (import.meta.env.DEV) {
    const page = new URLSearchParams(window.location.search).get('debug')
    if (page === 'units') return <DebugUnits />
    if (page === 'scene') return <DebugScene />
  }

  if (screen === 'editor') {
    return <GambitEditorScreen onRun={() => setScreen('combat')} />
  }
  return <CombatScreen />
}
