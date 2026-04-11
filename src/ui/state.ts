// Singleton game store — a plain subscribe/notify pattern.
// No Redux, no Zustand, no XState (architecture.md §6).
// The UI layer reads state via useGameState; the logic layer never touches this file.

import type { CombatState } from '../logic'

type Listener = () => void

let _state: CombatState | null = null
const _listeners = new Set<Listener>()

export const gameStore = {
  getState(): CombatState | null {
    return _state
  },
  setState(next: CombatState | null): void {
    _state = next
    _listeners.forEach(l => l())
  },
  subscribe(listener: Listener): () => void {
    _listeners.add(listener)
    return () => {
      _listeners.delete(listener)
    }
  },
} as const
