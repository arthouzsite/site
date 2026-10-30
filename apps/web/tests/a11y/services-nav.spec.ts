import { expect, test, type Page } from '@playwright/test'
import { PORT_SETTLE, settle } from '../visual/harness'
import { PORT_URL } from '../visual/paths'
import { findSmallTargets } from './hit-area'
import { stubRemoteImages } from './stub-remote-images'

const WIDTHS = [880, 1024, 1440] as const
const VIEWPORT_HEIGHT = 900
const SUBPIXEL = 0.01

async function openHome(page: Page, width: number): Promise<void> {
  await stubRemoteImages(page)
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(`${PORT_URL}/`, { waitUntil: 'load' })
  await settle(page, PORT_SETTLE)
}

/** Left edges of every control in the desktop nav, in document order. */
function navLeftEdges(page: Page): Promise<number[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('header nav[aria-label="Main"] > a, header nav[aria-label="Main"] > button, header nav[aria-label="Main"] > div > a'))
      .map((el) => el.getBoundingClientRect().left),
  )
}

test.describe('Services nav item', () => {
  for (const width of WIDTHS) {
    test(`the touch chevron shifts no other nav item at ${width}`, async ({ page }) => {
      await openHome(page, width)
      const toggle = page.getByRole('button', { name: 'Show services' })
      await expect(toggle).toHaveCount(1)
      const withToggle = await navLeftEdges(page)
      await page.addStyleTag({ content: 'button[aria-label="Show services"] { display: none !important }' })
      const withoutToggle = await navLeftEdges(page)
      expect(withToggle).toHaveLength(withoutToggle.length)
      withToggle.forEach((left, index) => expect(Math.abs(left - (withoutToggle[index] ?? Infinity))).toBeLessThan(SUBPIXEL))
    })

    test(`the chevron opens a panel that stays inside the viewport at ${width}`, async ({ page }) => {
      await openHome(page, width)
      const toggle = page.getByRole('button', { name: 'Show services' })
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-expanded', 'true')
      const panel = page.locator(`#${await toggle.getAttribute('aria-controls')}`)
      await expect(panel).toBeVisible()
      const box = await panel.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width)
      expect(await findSmallTargets(page)).toEqual([])
      await toggle.click()
      await expect(panel).toBeHidden()
    })
  }

  test('the chevron is transparent at rest, drawn on keyboard focus, and in the Tab order after the link', async ({ page }) => {
    await openHome(page, 1440)
    const toggle = page.getByRole('button', { name: 'Show services' })
    await expect(toggle).toHaveCSS('opacity', '0')
    await page.getByRole('link', { name: 'Services', exact: true }).first().focus()
    await page.keyboard.press('Tab')
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveCSS('opacity', '1')
  })
})
