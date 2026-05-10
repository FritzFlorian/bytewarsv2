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
import { completeDraftPreferV08 } from './helpers'

const OUT_DIR = 'test-results/artifacts/readme'

// Pinned seed so the screenshots are reproducible across machines and so the
// captured fight reliably exercises v0.8 status / AoE visuals. With seed=48,
// pick-1 offers Pyromancer Vacuum and the v0.8-aware draft helper picks it,
// so the combat scene shows a 2-round burning status badge on the enemy.
const SCREENSHOT_SEED = 48

function ensureOutDir() {
  mkdirSync(resolve(process.cwd(), OUT_DIR), { recursive: true })
}

test('readme: map screen', async ({ page }) => {
  ensureOutDir()
  await page.goto(`/?seed=${SCREENSHOT_SEED}`)
  await completeDraftPreferV08(page)
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
  await expect(page.getByRole('button', { name: '⚔' }).first()).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/map.png`, fullPage: true })
})

test('readme: gambit editor', async ({ page }) => {
  ensureOutDir()
  await page.goto(`/?seed=${SCREENSHOT_SEED}`)
  await completeDraftPreferV08(page)
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚔' }).first()
  await reachable.click()
  await expect(page.getByRole('button', { name: 'Run' })).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/editor.png`, fullPage: true })
})

test('readme: combat playback mid-fight', async ({ page }) => {
  ensureOutDir()
  await page.goto(`/?seed=${SCREENSHOT_SEED}`)
  await completeDraftPreferV08(page)
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚔' }).first()
  await reachable.click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  // Pause immediately then step forward ~16 events. With a v0.8 player preset
  // (Pyromancer Vacuum / Saboteur Butler) at least one round has resolved by
  // step 16 — long enough for a status_applied event to have fired and the
  // burning / disabled badge to appear on at least one enemy unit.
  await page.getByRole('button', { name: 'Pause' }).click()
  const stepBtn = page.getByRole('button', { name: 'Step' })
  for (let i = 0; i < 16; i++) {
    await stepBtn.click()
  }
  await page.screenshot({ path: `${OUT_DIR}/combat.png`, fullPage: true })
})
