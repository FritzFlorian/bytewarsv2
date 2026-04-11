// Seeded pseudo-random number generator (Mulberry32).
//
// Rules:
//   - All randomness in the logic layer MUST come from an RNG instance created
//     here — never from Math.random() (banned by the lint rule).
//   - Always pass the seed explicitly so runs are reproducible.
//   - The same seed produces the same sequence across two createRng() instances.

export interface Rng {
  /** Returns the next float in [0, 1). */
  next(): number
  /** Returns the next integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number
}

/** Mulberry32 — fast, good statistical properties, not cryptographic. */
export function createRng(seed: number): Rng {
  let s = seed >>> 0

  function next(): number {
    s = (s + 0x6d2b79f5) >>> 0
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    z = (z ^ (z >>> 14)) >>> 0
    return z / 0x100000000
  }

  function nextInt(maxExclusive: number): number {
    return Math.floor(next() * maxExclusive)
  }

  return { next, nextInt }
}
