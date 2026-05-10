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

/**
 * Complete the draft, preferring v0.8-feature presets (Pyromancer / Saboteur /
 * any preset whose name suggests a status-effect module). Falls back to the
 * first card when no preferred name is offered. Used by readme screenshots so
 * the captured combat actually exercises v0.8 visuals.
 */
export async function completeDraftPreferV08(page: Page) {
  // Pyromancer wins — its flamethrower applies a 2-round burning, so the
  // badge stays visible for a wide screenshot window. Saboteur's jam_signal
  // only lasts 1 round so the badge expires almost immediately.
  const preferenceOrder = [/Pyromancer/i, /Saboteur/i]

  for (let pick = 1; pick <= 2; pick++) {
    const cards = page.locator('button').filter({ hasText: /HP/ })
    await expect(cards.first()).toBeVisible()
    let clicked = false
    for (const preferRegex of preferenceOrder) {
      const preferred = cards.filter({ hasText: preferRegex }).first()
      if ((await preferred.count()) > 0) {
        await preferred.click()
        clicked = true
        break
      }
    }
    if (!clicked) await cards.first().click()
    await page.getByRole('button', { name: 'Confirm' }).click()
  }

  await expect(page.getByRole('heading', { name: 'Bytewars' })).toBeVisible()
}
