// Shared e2e helpers.

import { expect, type Page } from '@playwright/test'

/**
 * Complete the starter-draft screen by picking the first option in both rounds.
 * After this, the page will be on the map screen.
 */
export async function completeDraft(page: Page) {
  // Pick 1: click first preset card, then Confirm.
  const card1 = page.locator('button').filter({ hasText: /HP/ }).first()
  await expect(card1).toBeVisible()
  await card1.click()
  await page.getByRole('button', { name: 'Confirm' }).click()

  // Pick 2: click first preset card, then Confirm.
  const card2 = page.locator('button').filter({ hasText: /HP/ }).first()
  await expect(card2).toBeVisible()
  await card2.click()
  await page.getByRole('button', { name: 'Confirm' }).click()

  // Should now be on the map screen.
  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
}
