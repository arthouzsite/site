import { expect, test } from '@playwright/test'
import { ADMIN_URL, API_URL, HERO_ALT, HERO_FILE_NAME, SEED_ADMIN, WEB_URL, makeHeroJpeg, signIn } from './fixtures'

const TITLE = 'Salt Line'
const SLUG = 'salt-line'
const ARTIST = 'Parvathi Nayar'
const PUBLIC_VISIBILITY_BUDGET_MS = 5_000
// Generous so a cold first render of the public list cannot flake the poll; the budget above is asserted on elapsed time.
const COLD_RENDER_TIMEOUT_MS = 30_000
const POLL_ATTEMPT_TIMEOUT_MS = 1_000

test('editor publishes an exhibition and the public site lists it with its hero image within 5 s', async ({ page }) => {
  await signIn(page)

  await page.goto(`${ADMIN_URL}/exhibitions/new`)
  await page.getByLabel(/^Title/).fill(TITLE)
  await page.getByLabel('Subtitle').fill('New work on paper')
  await page.getByLabel('Type').selectOption('SOLO')
  await page.getByLabel('City').fill('Chennai')
  await page.getByLabel('Country').fill('India')
  await page.getByLabel('Venue').fill('Art Houz Chennai')
  await page.getByLabel('Start date').fill('2026-11-01')
  await page.getByLabel('End date').fill('2026-12-20')
  await page.getByLabel('Blurb').fill('Drawings made from the salt pans of the Coromandel coast.')
  await page.getByLabel('Body').fill('A solo presentation of recent drawings and cast-paper works.')

  await page.getByRole('button', { name: 'Choose image' }).click()
  const picker = page.getByRole('dialog', { name: 'Choose image' })
  await picker.getByRole('tab', { name: 'Upload' }).click()
  await picker.locator('input[type="file"]').setInputFiles({
    name: HERO_FILE_NAME,
    mimeType: 'image/jpeg',
    buffer: await makeHeroJpeg(),
  })
  await picker.getByLabel(`Alt text for ${HERO_FILE_NAME}`).fill(HERO_ALT)
  await picker.getByRole('button', { name: 'Upload 1 file' }).click()
  await picker.getByRole('button', { name: 'Use this image' }).click()
  const heroPreview = page.getByRole('img', { name: HERO_ALT })
  await expect(heroPreview).toBeVisible()
  const heroUrl = await heroPreview.getAttribute('src')
  expect(heroUrl).toBeTruthy()

  await page.getByLabel('Add artist').fill('Parvathi')
  await page.getByRole('button', { name: `Add ${ARTIST}` }).click()

  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForURL(/\/admin\/exhibitions\/[0-9a-f-]{36}$/)

  // The switch is controlled by the saved record, so it flips only once the publish request resolves.
  const publishedSwitch = page.getByRole('switch', { name: 'Published' })
  await publishedSwitch.click()
  await expect(publishedSwitch).toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: `Published · ${TITLE}` })).toBeVisible()
  const publishedAt = Date.now()

  // The API fires revalidation on publish; poll the public list until the page reflects it.
  await page.goto(`${WEB_URL}/exhibitions`)
  const hero = page.getByRole('article').filter({ hasText: TITLE }).locator('img').first()
  await expect(async () => {
    await page.reload()
    await expect(hero).toHaveAttribute('src', new RegExp(escapeRegExp(heroUrl!)), { timeout: POLL_ATTEMPT_TIMEOUT_MS })
  }).toPass({ timeout: COLD_RENDER_TIMEOUT_MS })
  expect(Date.now() - publishedAt).toBeLessThanOrEqual(PUBLIC_VISIBILITY_BUDGET_MS)

  await page.goto(`${WEB_URL}/exhibitions/${SLUG}`)
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible()
  await expect(page.getByText(ARTIST).first()).toBeVisible()
})

test('a signed-out deep link returns to the editor after login', async ({ page }) => {
  await signIn(page)
  const listed = await page.request.get(`${API_URL}/exhibitions`)
  const [exhibition] = ((await listed.json()) as { data: Array<{ id: string; title: string }> }).data
  expect(exhibition).toBeDefined()
  await page.context().clearCookies()

  const deepLink = `${ADMIN_URL}/exhibitions/${exhibition!.id}`
  await page.goto(deepLink)
  await expect(page).toHaveURL(`${ADMIN_URL}/login?next=%2Fexhibitions%2F${exhibition!.id}`)

  await page.getByLabel('Email').fill(SEED_ADMIN.email)
  await page.getByRole('textbox', { name: 'Password' }).fill(SEED_ADMIN.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(deepLink)
  await expect(page.getByRole('heading', { level: 1, name: exhibition!.title })).toBeVisible()

  // A reload of the deep link is served by the catch-all page, not a 404.
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: exhibition!.title })).toBeVisible()
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
