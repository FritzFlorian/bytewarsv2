// Generates the screenshots embedded in the README's Current State section.
// Outputs go to a gitignored scratch dir (test-results/artifacts/readme/) so
// regular `pnpm check` runs don't dirty the working tree. The
// `refresh-readme-artifacts` pnpm script copies them into doc/ when the
// /refresh-readme skill is run.
//
// Tests walk the happy path: landing map → gambit editor → combat playback.

import { test, expect } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT_DIR = 'test-results/artifacts/readme'

function ensureOutDir() {
  mkdirSync(resolve(process.cwd(), OUT_DIR), { recursive: true })
}

test('readme: map screen', async ({ page }) => {
  ensureOutDir()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
  await expect(page.getByRole('button', { name: '⚙' }).first()).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/map.png`, fullPage: true })
})

test('readme: gambit editor', async ({ page }) => {
  ensureOutDir()
  await page.goto('/')
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚙' }).first()
  await reachable.click()
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/editor.png`, fullPage: true })
})

test('readme: combat playback mid-fight', async ({ page }) => {
  ensureOutDir()
  await page.goto('/')
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚙' }).first()
  await reachable.click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  // Pause immediately then step forward ~11 events (round_started + two full
  // turn cycles) to land on a frame with both sides visibly engaged.
  await page.getByRole('button', { name: 'Pause' }).click()
  const stepBtn = page.getByRole('button', { name: 'Step' })
  for (let i = 0; i < 11; i++) {
    await stepBtn.click()
  }
  await page.screenshot({ path: `${OUT_DIR}/combat.png`, fullPage: true })
})
