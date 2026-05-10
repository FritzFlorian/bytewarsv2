// Full-run e2e — proves the complete UI loop works end-to-end:
//   draft → map → editor → combat → reward → back to map.
//
// Does NOT walk the entire run to victory — that's covered by the
// logic-level fullRunSeed.test.ts + balanceSimulation.test.ts. This
// test only verifies the UI wiring across one full cycle.

import { test, expect } from '@playwright/test'
import { completeDraft } from './helpers'

const OUT = 'tests/e2e/.output'

test('draft → map → fight → reward → map cycle', async ({ page }) => {
  await page.goto('/')

  // ── Draft ──────────────────────────────────────────────────────────
  // Starter-draft screen should appear first.
  await expect(page.getByRole('heading', { name: /Draft Unit 1/ })).toBeVisible()
  await page.screenshot({ path: `${OUT}/full-run-00-draft.png`, fullPage: true })
  await completeDraft(page)

  // ── Map ────────────────────────────────────────────────────────────
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
  await page.screenshot({ path: `${OUT}/full-run-01-map.png`, fullPage: true })

  // ── Editor → Combat ────────────────────────────────────────────────
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚔' }).first()
  await reachable.click()
  await page.getByRole('button', { name: 'Run' }).click()

  // Speed up playback; wait for Continue.
  await page.locator('select').selectOption('10')
  const continueBtn = page.getByRole('button', { name: /Continue/ })
  await expect(continueBtn).toBeVisible({ timeout: 15_000 })
  await continueBtn.click()

  // ── Post-combat: reward or game-over ───────────────────────────────
  // With an unseeded run the first fight may be won or lost. Either
  // outcome proves the UI loop works.
  const rewardHeading = page.getByRole('heading', { name: 'Reward' })
  const gameOverHeading = page.getByRole('heading', { name: 'Run Failed' })

  const gotReward = await rewardHeading.isVisible().catch(() => false)
  const gotGameOver = await gameOverHeading.isVisible().catch(() => false)
  expect(gotReward || gotGameOver).toBe(true)

  if (gotReward) {
    await page.screenshot({ path: `${OUT}/full-run-02-reward.png`, fullPage: true })

    // Pick the first selectable offer (with sub-pick if needed) and confirm.
    const offerCards = page.locator('[class*="offerCard"]:not([disabled])')
    const firstOffer = offerCards.first()
    const firstOfferText = (await firstOffer.textContent()) ?? ''
    await firstOffer.click()

    if (!firstOfferText.includes('Partial Heal')) {
      const targetBtn = page
        .locator('button[class*="unitItem"]:not([disabled]), button[class*="slotCellEmpty"]')
        .first()
      await targetBtn.click()

      // Remove-module needs a second sub-pick (choose which module).
      if (firstOfferText.includes('Remove Module')) {
        const moduleBtn = page.locator('[class*="modulePickerItem"]:not([disabled])').first()
        await moduleBtn.click()
      }
    }

    await page.getByRole('button', { name: 'Confirm' }).click()

    // Back on the map.
    await expect(page.getByText('Select your next encounter')).toBeVisible()
    await page.screenshot({ path: `${OUT}/full-run-03-map-post-reward.png`, fullPage: true })
  }
})
