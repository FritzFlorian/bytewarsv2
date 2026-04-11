import { test, expect } from '@playwright/test'

// Screenshots land in tests/e2e/.output/ (set via outputDir in playwright.config.ts).
const OUT = 'tests/e2e/.output'

test('gambit editor loads as landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/01-editor.png`, fullPage: true })
})

test('unit tabs switch correctly', async ({ page }) => {
  await page.goto('/')
  // Vacuum tab is active by default
  await expect(page.getByRole('heading', { name: 'Vacuum' })).toBeVisible()
  // Switch to Butler tab
  await page.getByRole('button', { name: 'Butler' }).click()
  await expect(page.getByRole('heading', { name: 'Butler' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/02-butler-tab.png`, fullPage: true })
})

test('Run resolves combat and begins playback automatically', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Run' }).click()
  // CombatScene is now showing — Pause button means autoPlay fired
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByText(/\d+ \/ \d+ events/)).toBeVisible()
  await page.screenshot({ path: `${OUT}/03-combat-playing.png`, fullPage: true })
})

test('debug: all three chassis render at slot size', async ({ page }) => {
  await page.goto('/?debug=units')
  await expect(page.getByText('vacuum-class')).toBeVisible()
  await expect(page.getByText('butler-class')).toBeVisible()
  await expect(page.getByText('qa-rig (enemy)')).toBeVisible()
  await page.screenshot({ path: `${OUT}/04-chassis-debug.png`, fullPage: true })
})
