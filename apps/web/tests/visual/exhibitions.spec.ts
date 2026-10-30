import { expect, test, type Browser, type Page } from '@playwright/test'
import { expectVisualMatch, renderPort, renderPrototype, type PrototypeRoute } from './harness'

const WIDTHS = [375, 768, 1024, 1440] as const
const DESKTOP = 1440

async function compare(browser: Browser, name: string, route: PrototypeRoute, path: string, width: number): Promise<Page> {
  const prototypePage = await browser.newPage()
  const portPage = await browser.newPage()
  const prototype = await renderPrototype(prototypePage, { route, width })
  const port = await renderPort(portPage, { path, width })
  await expectVisualMatch(prototype, port, { name })
  return portPage
}

test.describe('exhibitions', () => {
  for (const width of WIDTHS) {
    test(`exhibitions list matches at ${width}`, async ({ browser }) => {
      await compare(browser, `exhibitions-list-${width}`, { page: 'exhibitions' }, '/exhibitions', width)
    })
    test(`exhibition detail tidewater matches at ${width}`, async ({ browser }) => {
      await compare(browser, `exhibition-tidewater-${width}`, { page: 'exhibition', param: 'tidewater' }, '/exhibitions/tidewater', width)
    })
  }

  test(`exhibitions filtered status=past&city=Chennai matches at ${DESKTOP}`, async ({ browser }) => {
    await compare(
      browser,
      `exhibitions-filtered-${DESKTOP}`,
      { page: 'exhibitions', city: 'Chennai', status: 'past' },
      '/exhibitions?status=past&city=Chennai',
      DESKTOP,
    )
  })

  test(`detail without press hides the Press block`, async ({ browser }) => {
    const portPage = await compare(browser, `exhibition-quiet-matter-${DESKTOP}`, { page: 'exhibition', param: 'quiet-matter' }, '/exhibitions/quiet-matter', DESKTOP)
    await expect(portPage.getByRole('heading', { name: 'Press' })).toHaveCount(0)
  })
})
