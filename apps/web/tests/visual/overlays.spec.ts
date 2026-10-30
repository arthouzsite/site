import { expect, test, type Page } from '@playwright/test'
import { PORT_SETTLE, PROTOTYPE_SETTLE, expectVisualMatch, renderPort, renderPrototype, settle } from './harness'

const SEARCH_WIDTHS = [1440, 375] as const
const SEARCH_INPUT = 'Search artists, exhibitions, news'
const EMPTY_WIDTH = 1440

/** Opens the port's search overlay from the header and types `q`; waits for the debounced results to render. */
async function searchOnPort(page: Page, q: string, ready: (page: Page) => Promise<void>): Promise<void> {
  await page.getByRole('button', { name: 'Search' }).locator('visible=true').first().click()
  await page.getByRole('textbox', { name: SEARCH_INPUT }).fill(q)
  await ready(page)
  await settle(page, PORT_SETTLE)
}

async function viewportShots(prototypePage: Page, portPage: Page): Promise<[Buffer, Buffer]> {
  await settle(prototypePage, PROTOTYPE_SETTLE)
  return Promise.all([
    prototypePage.screenshot({ animations: 'disabled', caret: 'hide' }),
    portPage.screenshot({ animations: 'disabled', caret: 'hide' }),
  ])
}

test.describe('search overlay', () => {
  for (const width of SEARCH_WIDTHS) {
    test(`search overlay with q=pich matches at ${width}`, async ({ browser }) => {
      const prototypePage = await browser.newPage()
      const portPage = await browser.newPage()
      // The prototype applies the whole stored route on mount, including `search` and `q`.
      await renderPrototype(prototypePage, { route: { page: 'home', search: true, q: 'pich' }, width })
      await renderPort(portPage, { path: '/', width })
      await searchOnPort(portPage, 'pich', (page) => expect(page.getByRole('link', { name: 'Vijay Pichumani', exact: true })).toBeVisible())
      const [prototype, port] = await viewportShots(prototypePage, portPage)
      await expectVisualMatch(prototype, port, { name: `search-pich-${width}` })
    })
  }

  test('empty search shows "Nothing found for “zzz”."', async ({ browser }) => {
    const prototypePage = await browser.newPage()
    const portPage = await browser.newPage()
    await renderPrototype(prototypePage, { route: { page: 'home', search: true, q: 'zzz' }, width: EMPTY_WIDTH })
    await renderPort(portPage, { path: '/', width: EMPTY_WIDTH })
    await searchOnPort(portPage, 'zzz', (page) => expect(page.getByText('Nothing found for “zzz”.', { exact: true })).toBeVisible())
    const [prototype, port] = await viewportShots(prototypePage, portPage)
    await expectVisualMatch(prototype, port, { name: `search-empty-${EMPTY_WIDTH}` })
  })
})
