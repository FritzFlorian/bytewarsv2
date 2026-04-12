// Chassis-preview e2e. Two jobs:
//   1. Screenshot the always-on preview page into doc/screenshots/.
//   2. Generate doc/generated/chassis-overview.md — the block the README
//      embeds between <!-- CHASSIS:START --> and <!-- CHASSIS:END -->.
//
// The /refresh-readme skill invokes this spec to refresh both
// artifacts after the drift audit has approved the preview's scope.

import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SCREENSHOT_PATH = 'doc/screenshots/chassis-overview.png'
const MARKDOWN_PATH = 'doc/generated/chassis-overview.md'
const README_SCREENSHOT_REF = 'doc/screenshots/chassis-overview.png'

interface AttackJson {
  id: string
  name: string
  damage: number
  cooldown: number
  initialCooldown: number
  chassis: string[]
}

// Ordering and display labels for the generated Markdown. Kept aligned with
// CHASSIS_ENTRIES in src/ui/screens/ChassisPreview/ChassisPreview.tsx; the
// Vitest drift guard (tests/ui/ChassisPreview.test.tsx) fails if the union
// changes without an update here.
const CHASSIS_ORDER: Array<{ id: string; label: string }> = [
  { id: 'vacuum', label: 'Vacuum' },
  { id: 'butler', label: 'Butler' },
  { id: 'qa-rig', label: 'QA-Rig' },
  { id: 'overseer', label: 'Overseer' },
]

function buildMarkdown(attacks: AttackJson[]): string {
  const lines: string[] = []
  lines.push(`![Chassis overview](${README_SCREENSHOT_REF})`)
  lines.push('')
  lines.push('| Chassis | Attack | DMG | CD | Init |')
  lines.push('|---|---|---:|---:|---:|')
  for (const { id, label } of CHASSIS_ORDER) {
    const rows = attacks.filter(a => a.chassis.includes(id))
    if (rows.length === 0) {
      lines.push(`| ${label} | _(no attacks)_ | | | |`)
      continue
    }
    for (const a of rows) {
      lines.push(
        `| ${label} | ${a.name} | ${a.damage} | ${a.cooldown} | ${a.initialCooldown} |`,
      )
    }
  }
  lines.push('')
  lines.push(
    '<sub>DMG = damage per hit · CD = cooldown (rounds) · Init = initial cooldown. '
      + 'Auto-generated — run `/refresh-readme` to refresh.</sub>',
  )
  return lines.join('\n') + '\n'
}

test('chassis preview renders all chassis with their attack stats', async ({ page }) => {
  await page.goto('/?preview=chassis')
  await expect(page.getByTestId('chassis-preview')).toBeVisible()
  for (const { id } of CHASSIS_ORDER) {
    await expect(page.getByTestId(`chassis-card-${id}`)).toBeVisible()
  }
})

test('generate chassis overview screenshot and markdown', async ({ page }) => {
  await page.goto('/?preview=chassis')
  const preview = page.getByTestId('chassis-preview')
  await expect(preview).toBeVisible()
  // Wait for any CSS-driven rendering to settle before screenshotting.
  await page.waitForLoadState('networkidle')

  await preview.screenshot({ path: SCREENSHOT_PATH })

  const attacksPath = resolve(process.cwd(), 'src/content/attacks.json')
  const attacks = JSON.parse(readFileSync(attacksPath, 'utf8')) as AttackJson[]
  const markdown = buildMarkdown(attacks)

  mkdirSync(dirname(resolve(process.cwd(), MARKDOWN_PATH)), { recursive: true })
  writeFileSync(resolve(process.cwd(), MARKDOWN_PATH), markdown, 'utf8')
})
