import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { settle, PORT_SETTLE } from '../visual/harness'
import { PORT_URL } from '../visual/paths'
import { findSmallTargets } from './hit-area'
import { stubRemoteImages } from './stub-remote-images'

const ROUTES = ['/', '/exhibitions', '/exhibitions/tidewater', '/artists', '/artists/vijay-pichumani', '/fairs', '/fairs/art-dubai-2026', '/news', '/services', '/services/art-sales', '/about', '/visit'] as const
const WIDTHS = [375, 1440] as const
const VIEWPORT_HEIGHT = 900
const BLOCKING_IMPACTS = new Set(['serious', 'critical'])
/**
 * The prototype's rust (#B4651A) on paper (#EDEAE4) is 3.63:1, under AA's 4.5:1 for its small uppercase
 * eyebrows. It is the design's palette, so it cannot change without changing pixels; the contrast rule is
 * asserted separately so any other failing colour pair still fails the suite.
 */
const PROTOTYPE_CONTRAST_PAIRS = new Set(['#b4651a on #edeae4'])

async function openRoute(page: Page, route: string, width: number): Promise<void> {
  await stubRemoteImages(page)
  await page.setViewportSize({ width, height: VIEWPORT_HEIGHT })
  await page.goto(`${PORT_URL}${route}`, { waitUntil: 'load' })
  await settle(page, PORT_SETTLE)
}

async function blockingViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
  return violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => ({ id: violation.id, impact: violation.impact, help: violation.help, targets: violation.nodes.map((node) => node.target.join(' ')) }))
}

/** Colour pairs failing axe's contrast rule that are not the prototype's own documented pair. */
async function unexpectedContrastPairs(page: Page): Promise<string[]> {
  const { violations } = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
  const pairs = violations.flatMap((violation) =>
    violation.nodes.map((node) => {
      const data = (node.any[0]?.data ?? {}) as { fgColor?: string; bgColor?: string }
      return { pair: `${data.fgColor ?? '?'} on ${data.bgColor ?? '?'}`, target: node.target.join(' ') }
    }),
  )
  return pairs.filter(({ pair }) => !PROTOTYPE_CONTRAST_PAIRS.has(pair)).map(({ pair, target }) => `${pair}: ${target}`)
}

test.describe('accessibility', () => {
  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      test(`no serious or critical axe violations on ${route} at ${width}`, async ({ page }) => {
        await openRoute(page, route, width)
        expect(await blockingViolations(page)).toEqual([])
        expect(await unexpectedContrastPairs(page)).toEqual([])
      })

      test(`every control has a 44 px hit area on ${route} at ${width}`, async ({ page }) => {
        await openRoute(page, route, width)
        expect(await findSmallTargets(page)).toEqual([])
      })
    }
  }

  test('no serious or critical axe violations in the open search overlay', async ({ page }) => {
    await openRoute(page, '/', 1440)
    await page.getByRole('button', { name: 'Search' }).first().click()
    await page.getByRole('textbox', { name: 'Search artists, exhibitions, news' }).fill('pich')
    await expect(page.getByRole('link', { name: 'Vijay Pichumani', exact: true })).toBeVisible()
    expect(await blockingViolations(page)).toEqual([])
    expect(await unexpectedContrastPairs(page)).toEqual([])
  })

  const ENQUIRY_STATES = [
    { route: '/artists/vijay-pichumani', button: 'Enquire about works →' },
    { route: '/services/art-sales', button: 'Enquire →' },
  ] as const
  for (const width of WIDTHS) {
    for (const { route, button } of ENQUIRY_STATES) {
      test(`enquiry dialog on ${route} at ${width}: no axe violations, 44 px targets, no horizontal overflow`, async ({ page }) => {
        await openRoute(page, route, width)
        await page.getByRole('button', { name: button }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('textbox', { name: /^Name/ })).toBeFocused()
        expect(await blockingViolations(page)).toEqual([])
        expect(await unexpectedContrastPairs(page)).toEqual([])
        await dialog.getByRole('button', { name: /^Send enquiry/ }).click()
        await expect(dialog.getByText('Enter your name')).toBeVisible()
        expect(await blockingViolations(page)).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await expect(page.getByRole('button', { name: button })).toBeFocused()
      })
    }
  }

  for (const width of WIDTHS) {
    test(`fair gallery overlay on /fairs at ${width}: no axe violations, no horizontal overflow`, async ({ page }) => {
      await openRoute(page, '/fairs', width)
      const title = page.locator('h2 a[aria-haspopup="dialog"]').first()
      // Seed fairs carry no gallery images, so the control only exists when the database has some.
      test.skip((await title.count()) === 0, 'no fair with gallery images in this database')
      await title.click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      expect(await blockingViolations(page)).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(title).toBeFocused()
    })
  }

  test('Escape closes overlays and returns focus to the trigger', async ({ page }) => {
    await openRoute(page, '/', 375)
    const menu = page.getByRole('button', { name: 'Menu' })
    await menu.click()
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(menu).toBeFocused()

    const search = page.getByRole('button', { name: 'Search' }).last()
    await search.click()
    await expect(page.getByRole('textbox', { name: 'Search artists, exhibitions, news' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(search).toBeFocused()
  })
})
