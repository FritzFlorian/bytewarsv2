// Full-run e2e (T-6.16): start → many fights → boss → victory.
//
// Boots the app with `?seed=10` which deterministically wins on auto-pilot
// (pinned by tests/logic/fullRunSeed.test.ts). The test loops over the map
// node-by-node, applying the same "repair_bay > combat > elite > boss"
// preference the simulator uses, until the Victory screen appears.

import { test, expect, type Page } from '@playwright/test'

const OUT = 'tests/e2e/.output'
const SEED = 10

const NODE_PRIORITY = ['repair_bay', 'combat', 'elite', 'boss'] as const

/** Pick a reachable map button by node-type priority and click it. */
async function clickNextNode(page: Page): Promise<'repair_bay' | 'combat' | 'elite' | 'boss'> {
  for (const type of NODE_PRIORITY) {
    const btn = page.locator(`button[data-node-type="${type}"]:not([disabled])`).first()
    if (await btn.count()) {
      await btn.click()
      return type
    }
  }
  throw new Error('no reachable map node found')
}

/** Pick the first reward offer + sub-pick if needed, then Confirm. */
async function pickReward(page: Page) {
  const offerCards = page
    .locator('button')
    .filter({ hasText: /Full Heal|Partial Heal|Rule Slot|New Unit/ })
  const firstOffer = offerCards.first()
  const firstOfferText = (await firstOffer.textContent()) ?? ''
  await firstOffer.click()

  // heal_all (Partial Heal) needs no sub-pick; everything else does.
  const needsSubPick = !firstOfferText.includes('Partial Heal')
  if (needsSubPick) {
    const targetBtn = page
      .locator('[class*="unitItem"]:not([disabled]), [class*="slotCellEmpty"]')
      .first()
    await targetBtn.click()
  }

  const confirm = page.getByRole('button', { name: 'Confirm' })
  await expect(confirm).toBeEnabled()
  await confirm.click()
}

test('full run: map → many fights → boss → victory', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto(`/?seed=${SEED}`)
  await page.screenshot({ path: `${OUT}/full-run-00-start.png`, fullPage: true })

  const victoryHeading = page.getByRole('heading', { name: 'Boss Defeated' })
  const continueBtn = page.getByRole('button', { name: /Continue/ })

  let stepGuard = 0
  while (!(await victoryHeading.isVisible().catch(() => false))) {
    if (++stepGuard > 20) throw new Error('full run did not finish within 20 nodes')

    const type = await clickNextNode(page)

    if (type === 'repair_bay') {
      // No combat — straight back to map.
      await expect(page.getByText('Select your next encounter')).toBeVisible()
      continue
    }

    // Combat / elite / boss → editor → Run → wait for Continue.
    await page.getByRole('button', { name: 'Run' }).click()
    await page.locator('select').selectOption('10')
    await expect(continueBtn).toBeVisible({ timeout: 30_000 })
    await continueBtn.click()

    // After a boss win the Victory screen appears; otherwise reward → map.
    if (type === 'boss') break

    await expect(page.getByRole('heading', { name: 'Reward' })).toBeVisible()
    await pickReward(page)
    await expect(page.getByText('Select your next encounter')).toBeVisible()
  }

  await expect(victoryHeading).toBeVisible()
  await page.screenshot({ path: `${OUT}/full-run-99-victory.png`, fullPage: true })
})
