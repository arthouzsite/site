import { expect, test, type Browser, type Page } from '@playwright/test'
import { setArtistIndexLayout } from './artistLayout'
import { expectVisualMatch, renderPort, renderPrototype, type PrototypeProps, type PrototypeRoute } from './harness'

const WIDTHS = [375, 768, 1024, 1440] as const
const DESKTOP = 1440

async function compare(
  browser: Browser,
  name: string,
  route: PrototypeRoute,
  path: string,
  width: number,
  props?: PrototypeProps,
): Promise<Page> {
  const prototypePage = await browser.newPage()
  const portPage = await browser.newPage()
  const prototype = await renderPrototype(prototypePage, { route, width, props })
  const port = await renderPort(portPage, { path, width })
  await expectVisualMatch(prototype, port, { name })
  return portPage
}

test.describe('artists grouped', () => {
  for (const width of WIDTHS) {
    test(`artists grouped matches at ${width}`, async ({ browser }) => {
      await compare(browser, `artists-grouped-${width}`, { page: 'artists' }, '/artists', width)
    })
  }

  test(`artists?q=pich shows only matches`, async ({ browser }) => {
    await compare(browser, `artists-q-pich-${DESKTOP}`, { page: 'artists', aq: 'pich' }, '/artists?q=pich', DESKTOP)
  })

  test(`artists?q=zzz shows the empty state`, async ({ browser }) => {
    const portPage = await compare(browser, `artists-q-zzz-${DESKTOP}`, { page: 'artists', aq: 'zzz' }, '/artists?q=zzz', DESKTOP)
    await expect(portPage.getByText('No artists match “zzz”.', { exact: true })).toBeVisible()
  })
})

test.describe('artists flowing', () => {
  test.beforeAll(async () => {
    await setArtistIndexLayout('FLOWING')
  })

  test.afterAll(async () => {
    await setArtistIndexLayout('GROUPED')
  })

  test(`artists flowing matches at ${DESKTOP}`, async ({ browser }) => {
    await compare(browser, `artists-flowing-${DESKTOP}`, { page: 'artists' }, '/artists', DESKTOP, { artistIndex: 'Flowing' })
  })
})

test.describe('artist detail', () => {
  for (const width of WIDTHS) {
    test(`artist detail vijay-pichumani matches at ${width}`, async ({ browser }) => {
      await compare(browser, `artist-vijay-pichumani-${width}`, { page: 'artist', param: 'Vijay Pichumani' }, '/artists/vijay-pichumani', width)
    })
  }

  test(`artist without exhibitions hides the block`, async ({ browser }) => {
    const portPage = await compare(browser, `artist-amol-pawar-${DESKTOP}`, { page: 'artist', param: 'Amol Pawar' }, '/artists/amol-pawar', DESKTOP)
    await expect(portPage.getByText('Exhibitions with Art Houz')).toHaveCount(0)
  })
})
