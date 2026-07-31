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

test('supports picking a battle team', async ({ page }) => {
  await page.goto('/#/pairs')
  await expect(page.getByRole('heading', { name: 'Battle Team Builder' })).toBeVisible()
  await expect(page.getByLabel('Lead Pokemon')).toHaveValue('kingambit')
  await page.getByLabel('Backup Pokemon').selectOption('lucario')
  await expect(page.getByText('Lucario backup')).toBeVisible()
  await expect(page.getByLabel('Fast move').first()).toBeVisible()
  await expect(page.getByLabel('Charged 1').first()).toBeVisible()
  await expect(page.getByLabel('Charged 2').first()).toBeVisible()
})

test('links explorer rows to moveset option A', async ({ page }) => {
  await page.goto('/#/pokemon')
  await page.getByRole('link', { name: 'Compare Mewtwo moveset' }).click()
  await expect(page).toHaveURL(/#\/movesets\?/)
  await expect(page.getByRole('heading', { name: 'Moveset Comparator' })).toBeVisible()
  await expect(page.getByLabel('Pokemon')).toHaveValue('mewtwo')
  await expect(page.getByLabel('Build A fast')).toHaveValue('CONFUSION')
  await expect(page.getByLabel('Build A Charged 1')).toHaveValue('PSYSTRIKE')
  await expect(page.getByLabel('Build A Charged 2')).toHaveValue('FLAMETHROWER')
})
