import { expect, test } from '@playwright/test'

test('loads the data explorer shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Rocket Pair Lab' })).toBeVisible()
  await page.getByRole('link', { name: 'Pokemon' }).click()
  await expect(page.getByRole('heading', { name: 'Pokemon Explorer' })).toBeVisible()
  await expect(page).toHaveURL(/#\/pokemon$/)
  await expect(page.getByText('Kingambit')).toBeVisible()
})

test('loads shared deep links', async ({ page }) => {
  await page.goto('/#/methodology')
  await expect(
    page.getByRole('heading', { name: 'Methodology and Sources' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Methodology' })).toHaveAttribute(
    'aria-current',
    'page',
  )
})
