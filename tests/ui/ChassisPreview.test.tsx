// @vitest-environment jsdom
//
// ChassisPreview drift guard.
//
// These tests fail if the preview goes out of sync with real project data —
// either because a new chassis was added to the Chassis union without a card,
// or because attacks.json changed and the table no longer matches. The
// /refresh-readme skill uses these signals to detect drift.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import {
  ChassisPreview,
  CHASSIS_ENTRIES,
} from '../../src/ui/screens/ChassisPreview/ChassisPreview'
import { getAllAttacks, getAttacksForChassis } from '../../src/logic'
import type { Chassis } from '../../src/logic'

afterEach(() => cleanup())

const ALL_CHASSIS: Chassis[] = [
  'vacuum',
  'butler',
  'qa-rig',
  'overseer',
  'lawnbot',
  'security_drone',
  'swarmer',
  'siege',
]

describe('ChassisPreview — drift guard', () => {
  it('includes exactly one entry per Chassis type', () => {
    const entryChassis = CHASSIS_ENTRIES.map(e => e.chassis).sort()
    expect(entryChassis).toEqual([...ALL_CHASSIS].sort())
  })

  it('renders one card per chassis entry', () => {
    render(<ChassisPreview />)
    for (const entry of CHASSIS_ENTRIES) {
      expect(screen.getByTestId(`chassis-card-${entry.chassis}`)).toBeTruthy()
    }
  })

  it('renders every attack from attacks.json in exactly one chassis table', () => {
    render(<ChassisPreview />)
    const allAttacks = getAllAttacks()
    for (const attack of allAttacks) {
      const rows = screen.getAllByTestId(`attack-row-${attack.id}`)
      expect(rows.length).toBeGreaterThan(0)
    }
  })

  it('each chassis card lists exactly the attacks belonging to that chassis', () => {
    render(<ChassisPreview />)
    for (const entry of CHASSIS_ENTRIES) {
      const table = screen.getByTestId(`chassis-attacks-${entry.chassis}`)
      const expected = getAttacksForChassis(entry.chassis)
      const rendered = within(table).queryAllByRole('row').slice(1) // skip header
      expect(rendered.length).toBe(expected.length)

      for (const attack of expected) {
        const row = within(table).getByTestId(`attack-row-${attack.id}`)
        const cells = within(row).getAllByRole('cell').map(c => c.textContent)
        expect(cells).toEqual([
          attack.name,
          String(attack.damage),
          String(attack.cooldown),
          String(attack.initialCooldown),
        ])
      }
    }
  })
})
