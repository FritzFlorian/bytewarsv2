import { useSyncExternalStore } from 'react'
import { gameStore } from '../state'
import type { CombatState } from '../../logic'
import { createCombat, walkingSkeletonFixture } from '../../logic'

// Intents are the only way the UI layer drives the logic layer.
// Expand this union as new screens and interactions are added.
export type Intent = { kind: 'start_combat'; seed?: number }

// Stable dispatch function — defined outside the hook so it is never re-created.
function dispatch(intent: Intent): void {
  switch (intent.kind) {
    case 'start_combat': {
      const seed = intent.seed ?? 42
      const { playerUnits, enemyUnits } = walkingSkeletonFixture()
      const state = createCombat(seed, playerUnits, enemyUnits)
      gameStore.setState(state)
      console.log('[start_combat] initial combat state:', state)
      break
    }
  }
}

export function useGameState(): [CombatState | null, (intent: Intent) => void] {
  const state = useSyncExternalStore(
    gameStore.subscribe,
    gameStore.getState,
    // Server snapshot — always null (no SSR in this game)
    () => null,
  )
  return [state, dispatch]
}
