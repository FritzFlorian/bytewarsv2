// Chassis-preview e2e. Two jobs:
//   1. Screenshot each chassis card individually into
//      test-results/artifacts/chassis/<id>.png (the whole page doesn't fit in
//      one screenshot once the roster grows past a handful of chassis).
//   2. Generate test-results/artifacts/chassis/chassis-overview.md — the block
//      the README embeds between <!-- CHASSIS:START --> and <!-- CHASSIS:END -->.
//      It references the per-chassis PNGs; the cards already render the attack
//      stats, so no separate stats table is emitted.
//
// The /refresh-readme skill invokes this spec (via `pnpm refresh-readme-artifacts`)
// to refresh the artifacts after the drift audit has approved the preview's scope.

import { test, expect } from '@playwright/test'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Artifacts land in a gitignored scratch dir; the `refresh-readme-artifacts`
// pnpm script copies them into doc/ when the /refresh-readme skill is run.
// README_IMG_DIR is the path embedded inside the generated Markdown — it
// points to the *final* location (doc/) since that's where the README
// references images from.
const ARTIFACTS_DIR = 'test-results/artifacts/chassis'
const MARKDOWN_PATH = `${ARTIFACTS_DIR}/chassis-overview.md`
const README_IMG_DIR = 'doc/screenshots/chassis'

// Ordering and display labels for the generated Markdown. Kept aligned with
// CHASSIS_ENTRIES in src/ui/screens/ChassisPreview/ChassisPreview.tsx; the
// Vitest drift guard (tests/ui/ChassisPreview.test.tsx) fails if the union
// changes without an update here.
const CHASSIS_ORDER: Array<{ id: string; label: string }> = [
  { id: 'vacuum', label: 'Vacuum' },
  { id: 'butler', label: 'Butler' },
  { id: 'qa-rig', label: 'QA-Rig' },
  { id: 'overseer', label: 'Overseer' },
  { id: 'lawnbot', label: 'Lawnbot' },
  { id: 'security_drone', label: 'Security-drone' },
  { id: 'swarmer', label: 'Swarmer' },
  { id: 'siege', label: 'Siege' },
]

function buildMarkdown(): string {
  const lines: string[] = []
  // Two-column HTML table so the cards sit side-by-side on GitHub. Markdown
  // image syntax would stack them vertically, which is a lot of scroll once
  // the roster grows.
  lines.push('<table>')
  for (let i = 0; i < CHASSIS_ORDER.length; i += 2) {
    const row = CHASSIS_ORDER.slice(i, i + 2)
    lines.push('  <tr>')
    for (const { id, label } of row) {
      lines.push(`    <td><img src="${README_IMG_DIR}/${id}.png" alt="${label}" width="430"/></td>`)
    }
    if (row.length === 1) lines.push('    <td></td>')
    lines.push('  </tr>')
  }
  lines.push('</table>')
  lines.push('')
  lines.push(
    '<sub>Stats are rendered inside each card. Auto-generated — run `/refresh-readme` to refresh.</sub>',
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

test('generate per-chassis screenshots and markdown', async ({ page }) => {
  await page.goto('/?preview=chassis')
  const preview = page.getByTestId('chassis-preview')
  await expect(preview).toBeVisible()
  // Wait for any CSS-driven rendering to settle before screenshotting.
  await page.waitForLoadState('networkidle')

  // Wipe any stale artifacts from previous runs so the downstream `cp *.png`
  // in `pnpm refresh-readme-artifacts` is deterministic (e.g., if a chassis
  // was removed from the roster, we don't want its old PNG to tag along).
  rmSync(resolve(process.cwd(), ARTIFACTS_DIR), { recursive: true, force: true })
  mkdirSync(resolve(process.cwd(), ARTIFACTS_DIR), { recursive: true })

  for (const { id } of CHASSIS_ORDER) {
    const card = page.getByTestId(`chassis-card-${id}`)
    await expect(card).toBeVisible()
    await card.screenshot({ path: `${ARTIFACTS_DIR}/${id}.png` })
  }

  const markdown = buildMarkdown()
  mkdirSync(dirname(resolve(process.cwd(), MARKDOWN_PATH)), { recursive: true })
  writeFileSync(resolve(process.cwd(), MARKDOWN_PATH), markdown, 'utf8')
})
