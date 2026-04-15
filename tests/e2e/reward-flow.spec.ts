// Reward-flow e2e (T-6.13): full map → combat → reward → map cycle.
//
// Boots the app with `?seed=1` which deterministically puts the starter
// squad in a fight they win (pinned by tests/logic/findWinningSeed.test.ts).
// The test then asserts the reward screen appears, picks an offer, and
// verifies the player lands back on the map.

import { test, expect } from '@playwright/test'

const OUT = 'tests/e2e/.output'
const SEED = 1

test('combat → reward → map cycle', async ({ page }) => {
  await page.goto(`/?seed=${SEED}`)

  // Click the first reachable combat node.
  const reachable = page.locator('button:not([disabled])').filter({ hasText: '⚔' }).first()
  await reachable.click()

  // Editor → Run.
  await page.getByRole('button', { name: 'Run' }).click()

  // Speed up playback so the fight resolves quickly.
  await page.locator('select').selectOption('10')

  // Combat plays; wait for the Continue button which only appears on completion.
  const continueBtn = page.getByRole('button', { name: /Continue/ })
  await expect(continueBtn).toBeVisible({ timeout: 15000 })
  await continueBtn.click()

  // Reward screen should now be visible.
  await expect(page.getByRole('heading', { name: 'Reward' })).toBeVisible()
  const confirm = page.getByRole('button', { name: 'Confirm' })
  await expect(confirm).toBeDisabled()

  await page.screenshot({ path: `${OUT}/06-reward.png`, fullPage: true })

  // Pick the first offer card.
  const offerCards = page
    .locator('button')
    .filter({ hasText: /Full Heal|Partial Heal|Rule Slot|New Unit/ })
  const firstOffer = offerCards.first()
  const firstOfferText = (await firstOffer.textContent()) ?? ''
  await firstOffer.click()

  // If the offer needs a sub-pick, make one. Heal-all is the only no-sub-pick
  // kind; otherwise click the first eligible target / slot.
  const needsSubPick = !firstOfferText.includes('Partial Heal')
  if (needsSubPick) {
    // Target buttons appear inside the sub-section. Click the first enabled
    // unit-picker button or slot-picker cell.
    const targetBtn = page
      .locator('[class*="unitItem"]:not([disabled]), [class*="slotCellEmpty"]')
      .first()
    await targetBtn.click()
  }

  await expect(confirm).toBeEnabled()
  await confirm.click()

  // After confirm, we should be back on the map screen (header "Bytewars"
  // + the map's subtitle).
  await expect(page.getByText('Select your next encounter')).toBeVisible()
  await page.screenshot({ path: `${OUT}/07-post-reward-map.png`, fullPage: true })
})
