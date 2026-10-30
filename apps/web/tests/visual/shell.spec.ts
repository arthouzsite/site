import { test, type Page } from '@playwright/test'
import { PORT_SETTLE, PROTOTYPE_SETTLE, expectVisualMatch, renderPort, renderPrototype, settle } from './harness'
import { cropPng } from './png'

const WIDTHS = [375, 1440] as const
const MENU_WIDTH = 375

/** Crops a full-page screenshot to an element's box (document coordinates). */
async function clipTo(page: Page, selector: 'header' | 'footer', fullPage: Buffer): Promise<Buffer> {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} is not rendered`)
  const scrollY = await page.evaluate(() => window.scrollY)
  return cropPng(fullPage, { ...box, y: box.y + scrollY })
}

test.describe('site shell', () => {
  for (const width of WIDTHS) {
    test(`header matches the prototype at ${width}`, async ({ browser }) => {
      // The header is identical on every page; the port has only the home placeholder so far.
      const prototypePage = await browser.newPage()
      const portPage = await browser.newPage()
      const prototype = await renderPrototype(prototypePage, { route: { page: 'home' }, width })
      const port = await renderPort(portPage, { path: '/', width })
      await expectVisualMatch(await clipTo(prototypePage, 'header', prototype), await clipTo(portPage, 'header', port), { name: `header-${width}` })
    })

    test(`footer matches the prototype at ${width}`, async ({ browser }) => {
      const prototypePage = await browser.newPage()
      const portPage = await browser.newPage()
      const prototype = await renderPrototype(prototypePage, { route: { page: 'visit' }, width })
      const port = await renderPort(portPage, { path: '/', width })
      await expectVisualMatch(await clipTo(prototypePage, 'footer', prototype), await clipTo(portPage, 'footer', port), { name: `footer-${width}` })
    })
  }

  test(`mobile menu matches the prototype at ${MENU_WIDTH}`, async ({ browser }) => {
    const prototypePage = await browser.newPage()
    const portPage = await browser.newPage()
    await renderPrototype(prototypePage, { route: { page: 'home' }, width: MENU_WIDTH })
    await renderPort(portPage, { path: '/', width: MENU_WIDTH })
    await prototypePage.getByRole('button', { name: 'Menu' }).click()
    await portPage.getByRole('button', { name: 'Menu' }).click()
    await Promise.all([settle(prototypePage, PROTOTYPE_SETTLE), settle(portPage, PORT_SETTLE)])
    const [prototype, port] = await Promise.all([
      prototypePage.screenshot({ animations: 'disabled', caret: 'hide' }),
      portPage.screenshot({ animations: 'disabled', caret: 'hide' }),
    ])
    await expectVisualMatch(prototype, port, { name: `menu-${MENU_WIDTH}` })
  })
})
