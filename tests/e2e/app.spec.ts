import { expect, test } from '@playwright/test'

test('loads the data explorer shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Rocket Pair Lab' })).toBeVisible()
  await page.getByRole('button', { name: 'Pokemon' }).click()
  await expect(page.getByRole('heading', { name: 'Pokemon Explorer' })).toBeVisible()
  await expect(page.getByText('Kingambit')).toBeVisible()
})
