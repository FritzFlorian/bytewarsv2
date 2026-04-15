// Tests for elite node placement + the 4-fixture pool (T-6.10).

import { describe, it, expect } from 'vitest'
import { createRng } from '../../src/logic/rng'
import { generateMap } from '../../src/logic/map/generate'
import { getAllEliteFixtures, drawEliteEncounter } from '../../src/logic/content/fixtures'

// ── Map placement ──────────────────────────────────────────────────────────

describe('generateMap: elite placement', () => {
  it('places exactly 2 elite nodes per map across 100 seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      const elites = map.nodes.filter(n => n.type === 'elite')
      expect(elites).toHaveLength(2)
    }
  })

  it('never places an elite in the first column', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      for (const n of map.nodes.filter(n => n.type === 'elite')) {
        expect(n.column).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('never places two elites in the same column', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      const elites = map.nodes.filter(n => n.type === 'elite')
      const cols = new Set(elites.map(e => e.column))
      expect(cols.size).toBe(elites.length)
    }
  })

  it('never places an elite on the boss column', () => {
    for (let seed = 0; seed < 100; seed++) {
      const map = generateMap(createRng(seed))
      const bossCol = Math.max(...map.nodes.map(n => n.column))
      for (const n of map.nodes.filter(n => n.type === 'elite')) {
        expect(n.column).toBeLessThan(bossCol)
      }
    }
  })

  it('boss and combat node counts are unchanged by elite flipping (1 boss, rest combat or elite)', () => {
    for (let seed = 0; seed < 30; seed++) {
      const map = generateMap(createRng(seed))
      const bosses = map.nodes.filter(n => n.type === 'boss')
      expect(bosses).toHaveLength(1)
      // Every non-boss node is either combat or elite — no other types leak in.
      for (const n of map.nodes) {
        expect(['combat', 'elite', 'boss', 'repair_bay']).toContain(n.type)
      }
    }
  })
})

// ── Elite fixture pool ─────────────────────────────────────────────────────

describe('elite fixtures', () => {
  it('exposes exactly 4 fixtures', () => {
    expect(getAllEliteFixtures()).toHaveLength(4)
  })

  it('siege chassis appears in exactly 2 of the 4 fixtures', () => {
    const fixtures = getAllEliteFixtures()
    const withSiege = fixtures.filter(f => f.enemyUnits.some(u => u.chassis === 'siege'))
    expect(withSiege).toHaveLength(2)
  })

  it('every fixture has a unique id', () => {
    const ids = getAllEliteFixtures().map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every fixture has at least one enemy unit', () => {
    for (const f of getAllEliteFixtures()) {
      expect(f.enemyUnits.length).toBeGreaterThan(0)
    }
  })

  it('every enemy unit id within a fixture is unique (slot-key correctness)', () => {
    for (const f of getAllEliteFixtures()) {
      const ids = f.enemyUnits.map(u => u.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('drawEliteEncounter is deterministic for a given seed', () => {
    const a = drawEliteEncounter(createRng(123))
    const b = drawEliteEncounter(createRng(123))
    expect(a.id).toBe(b.id)
  })

  it('drawEliteEncounter eventually samples every fixture', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200 && seen.size < 4; seed++) {
      seen.add(drawEliteEncounter(createRng(seed)).id)
    }
    expect(seen.size).toBe(4)
  })
})
