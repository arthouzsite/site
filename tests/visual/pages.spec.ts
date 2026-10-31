import { test, type Browser } from '@playwright/test'
import { expectVisualMatch, renderPort, renderPrototype, type PrototypeRoute } from './harness'

const WIDTHS = [375, 768, 1024, 1440] as const
const TAB_WIDTHS = [1440, 375] as const
const TABS = ['gallery', 'proprietor', 'services', 'publications'] as const

async function compare(browser: Browser, name: string, route: PrototypeRoute, path: string, width: number): Promise<void> {
  const prototypePage = await browser.newPage()
  const portPage = await browser.newPage()
  const prototype = await renderPrototype(prototypePage, { route, width })
  const port = await renderPort(portPage, { path, width })
  await expectVisualMatch(prototype, port, { name })
}

test.describe('pages', () => {
  for (const page of ['fairs', 'news', 'visit'] as const) {
    for (const width of WIDTHS) {
      test(`${page} matches at ${width}`, async ({ browser }) => {
        await compare(browser, `${page}-${width}`, { page }, `/${page}`, width)
      })
    }
  }

  for (const tab of TABS) {
    for (const width of TAB_WIDTHS) {
      test(`about ${tab} tab matches at ${width}`, async ({ browser }) => {
        await compare(browser, `about-${tab}-${width}`, { page: 'about', tab }, `/about?tab=${tab}`, width)
      })
    }
  }
})
