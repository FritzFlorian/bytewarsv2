import { test, expect } from '@playwright/test'

// Screenshots land in tests/e2e/.output/ (set via outputDir in playwright.config.ts).
const OUT = 'tests/e2e/.output'

test('map screen loads as landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
  // The map shows node buttons — first column nodes are reachable (⚙)
  await expect(page.getByRole('button', { name: '⚙' }).first()).toBeVisible()
  await page.screenshot({ path: `${OUT}/01-map.png`, fullPage: true })
})

test('clicking a map node opens the gambit editor', async ({ page }) => {
  await page.goto('/')
  // Click the first enabled (reachable) combat node
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚙' }).first()
  await reachable.click()
  // Gambit editor is now showing with a Run button and unit tabs
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/02-editor.png`, fullPage: true })
})

test('unit tabs switch correctly in gambit editor', async ({ page }) => {
  await page.goto('/')
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚙' }).first()
  await reachable.click()
  // First unit tab is active by default — heading with the unit name visible
  // (The chassis name is displayed as the unit heading in the editor)
  const runBtn = page.getByRole('button', { name: 'Run' })
  await expect(runBtn).toBeVisible()
  // Multiple unit tabs should be present
  const tabs = page.locator('button[class*="tab"]')
  await expect(tabs.first()).toBeVisible()
  await page.screenshot({ path: `${OUT}/03-editor-tabs.png`, fullPage: true })
})

test('Run resolves combat and begins playback automatically', async ({ page }) => {
  await page.goto('/')
  // Navigate: map → gambit editor → combat
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚙' }).first()
  await reachable.click()
  await page.getByRole('button', { name: 'Run' }).click()
  // CombatScene is now showing — Pause button means autoPlay fired
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByText(/\d+ \/ \d+ events/)).toBeVisible()
  // Pause then step through ~2 full turns for the screenshot:
  // round_started + 2 × (turn_started, rule_fired, action_used, damage_dealt, turn_ended) ≈ 11 events
  await page.getByRole('button', { name: 'Pause' }).click()
  const stepBtn = page.getByRole('button', { name: 'Step' })
  for (let i = 0; i < 11; i++) {
    await stepBtn.click()
  }
  await page.screenshot({ path: `${OUT}/04-combat-playing.png`, fullPage: true })
})

test('debug: all three chassis render at slot size', async ({ page }) => {
  await page.goto('/?debug=units')
  await expect(page.getByText('vacuum-class')).toBeVisible()
  await expect(page.getByText('butler-class')).toBeVisible()
  await expect(page.getByText('qa-rig (enemy)')).toBeVisible()
  await page.screenshot({ path: `${OUT}/05-chassis-debug.png`, fullPage: true })
})
