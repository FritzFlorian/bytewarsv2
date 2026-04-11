// v0.1: single-screen app — only the Combat screen is rendered.
// Additional screens (RunMap, GambitEditor, etc.) land in later versions.
//
// Dev-only debug pages are gated behind import.meta.env.DEV. Vite replaces
// that constant with `false` in production builds, so the branches are
// dead-code-eliminated and the debug imports are tree-shaken out.

import { CombatScreen } from './screens/Combat/CombatScreen'
import { DebugUnits } from './screens/Combat/_DebugUnits'

export default function App() {
  if (import.meta.env.DEV) {
    const page = new URLSearchParams(window.location.search).get('debug')
    if (page === 'units') return <DebugUnits />
  }
  return <CombatScreen />
}
