import { test, expect } from '@playwright/test'

// Screenshots land in tests/e2e/.output/ (set via outputDir in playwright.config.ts).
// Playwright names them automatically; pass a fixed path for ones I want to Read later.
const OUT = 'tests/e2e/.output'

test('combat screen loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Combat' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/01-initial.png`, fullPage: true })
})

test('Start Combat disables after click and logs state', async ({ page }) => {
  await page.goto('/')
  const btn = page.getByRole('button', { name: 'Start Combat' })
  await btn.click()
  await expect(btn).toBeDisabled()
  await page.screenshot({ path: `${OUT}/02-after-start.png`, fullPage: true })
})
