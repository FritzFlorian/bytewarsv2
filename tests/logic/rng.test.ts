import { expect, test } from 'vitest'
import { createRng } from '../../src/logic/rng'

test('T-1.4: same seed produces identical sequence across two instances', () => {
  const a = createRng(12345)
  const b = createRng(12345)

  for (let i = 0; i < 100; i++) {
    expect(a.next()).toBe(b.next())
  }
})

test('T-1.4: next() returns values in [0, 1)', () => {
  const rng = createRng(99)
  for (let i = 0; i < 100; i++) {
    const v = rng.next()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  }
})

test('T-1.4: nextInt() returns values in [0, maxExclusive)', () => {
  const rng = createRng(77)
  for (let i = 0; i < 100; i++) {
    const v = rng.nextInt(6)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(6)
    expect(Number.isInteger(v)).toBe(true)
  }
})

test('T-1.4: different seeds produce different sequences', () => {
  const a = createRng(1)
  const b = createRng(2)
  const seqA = Array.from({ length: 10 }, () => a.next())
  const seqB = Array.from({ length: 10 }, () => b.next())
  expect(seqA).not.toEqual(seqB)
})
