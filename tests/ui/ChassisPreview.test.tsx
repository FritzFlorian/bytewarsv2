// @vitest-environment jsdom
//
// ChassisPreview drift guard.
//
// Fails if the preview goes out of sync with real project data — either
// because a new chassis was added to the Chassis union without a card, or
// because chassis JSON stats changed and the card no longer matches. The
// /refresh-readme skill uses these signals to detect drift.

import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { ChassisPreview, CHASSIS_ENTRIES } from '../../src/ui/screens/ChassisPreview/ChassisPreview'
import { getChassisDef } from '../../src/logic'
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

  it('each chassis card shows its base stats from the chassis JSON', () => {
    render(<ChassisPreview />)
    for (const entry of CHASSIS_ENTRIES) {
      const def = getChassisDef(entry.chassis)
      const table = screen.getByTestId(`chassis-stats-${entry.chassis}`)
      const cellsByLabel: Record<string, string | null> = {}
      for (const row of within(table).getAllByRole('row')) {
        const cells = within(row).getAllByRole('cell')
        cellsByLabel[cells[0].textContent ?? ''] = cells[1]?.textContent ?? null
      }
      expect(cellsByLabel['Base HP']).toBe(String(def.baseHp))
      expect(cellsByLabel['Rule slots']).toBe(String(def.baseRuleSlots))
      expect(cellsByLabel['Active slots']).toBe(String(def.activeSlots))
      expect(cellsByLabel['Passive slots']).toBe(String(def.passiveSlots))
    }
  })

  it('each chassis card shows its availability', () => {
    render(<ChassisPreview />)
    for (const entry of CHASSIS_ENTRIES) {
      const def = getChassisDef(entry.chassis)
      const badge = screen.getByTestId(`chassis-availability-${entry.chassis}`)
      expect(badge.textContent?.toLowerCase()).toBe(def.availability.toLowerCase())
    }
  })
})
