// Public entry point for the render layer.
//
// T-0.4's ESLint boundary rule restricts src/ui/** imports from src/render/**
// to this file only. Every symbol the UI needs from the render layer must be
// re-exported here; nothing else in src/render/ should be imported directly
// from src/ui/.

export { CombatScene } from './CombatScene'
export type { CombatSceneProps } from './CombatScene'
export type { UnitInfo, PlaybackSpeed } from '../playback'

// Dev-only debug page — dead-code-eliminated in production by Vite.
// Re-exported here so src/ui/ can import it via the public entry point
// rather than reaching into render internals directly.
export { DebugScene } from './_DebugScene'
