import { expect, test } from '@playwright/test'
import { HERO_ALT, HERO_FILE_NAME, WEB_URL, makeHeroJpeg, signIn } from './fixtures'

const TITLE = 'Salt Line'
const SLUG = 'salt-line'
const ARTIST = 'Parvathi Nayar'
const PUBLIC_VISIBILITY_TIMEOUT_MS = 5_000
const POLL_ATTEMPT_TIMEOUT_MS = 1_000

test('editor publishes an exhibition and the public site lists it with its hero image within 5 s', async ({ page }) => {
  await signIn(page)

  await page.goto('/exhibitions/new')
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
  await page.waitForURL(/\/exhibitions\/[0-9a-f-]{36}$/)

  // The switch is controlled by the saved record, so it flips only once the publish request resolves.
  const publishedSwitch = page.getByRole('switch', { name: 'Published' })
  await publishedSwitch.click()
  await expect(publishedSwitch).toBeChecked()
  await expect(page.getByRole('status').filter({ hasText: `Published · ${TITLE}` })).toBeVisible()

  // The API fires revalidation on publish; poll the public list until the page reflects it.
  await page.goto(`${WEB_URL}/exhibitions`)
  const hero = page.getByRole('article').filter({ hasText: TITLE }).locator('img').first()
  await expect(async () => {
    await page.reload()
    await expect(hero).toHaveAttribute('src', new RegExp(escapeRegExp(heroUrl!)), { timeout: POLL_ATTEMPT_TIMEOUT_MS })
  }).toPass({ timeout: PUBLIC_VISIBILITY_TIMEOUT_MS })

  await page.goto(`${WEB_URL}/exhibitions/${SLUG}`)
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible()
  await expect(page.getByText(ARTIST).first()).toBeVisible()
})

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
