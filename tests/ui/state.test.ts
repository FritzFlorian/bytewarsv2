// @vitest-environment jsdom
// UI layer tests run in jsdom; logic tests remain in node env (architecture.md §9).

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGameState } from '../../src/ui/hooks/useGameState'
import { gameStore } from '../../src/ui/state'

describe('gameStore', () => {
  beforeEach(() => {
    gameStore.setState(null)
  })

  it('returns null as initial state', () => {
    expect(gameStore.getState()).toBeNull()
  })

  it('notifies subscribers when state changes', () => {
    let notified = false
    const unsub = gameStore.subscribe(() => { notified = true })
    gameStore.setState(null) // trigger with null to test notification
    unsub()
    expect(notified).toBe(true)
  })

  it('unsubscribes correctly', () => {
    let count = 0
    const unsub = gameStore.subscribe(() => { count++ })
    gameStore.setState(null)
    unsub()
    gameStore.setState(null)
    expect(count).toBe(1)
  })
})

describe('useGameState', () => {
  beforeEach(() => {
    gameStore.setState(null)
  })

  it('returns null as initial state', () => {
    const { result } = renderHook(() => useGameState())
    const [state] = result.current
    expect(state).toBeNull()
  })

  it('re-renders with new state when start_combat is dispatched', async () => {
    const { result } = renderHook(() => useGameState())

    expect(result.current[0]).toBeNull()

    await act(async () => {
      result.current[1]({ kind: 'start_combat', seed: 42 })
    })

    const [newState] = result.current
    expect(newState).not.toBeNull()
    expect(newState?.finished).toBe(false)
    expect(newState?.seed).toBe(42)
  })
})
