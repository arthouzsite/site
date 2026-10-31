import { test } from '@playwright/test'
import { putSetting } from './admin-settings'
import { expectVisualMatch, renderPort, renderPrototype } from './harness'

const FULL_BLEED_WIDTHS = [375, 768, 1024, 1440] as const
const SPLIT_WIDTHS = [1440, 375] as const

type HeroLayout = 'FULL_BLEED' | 'SPLIT'

/** Sets the hero layout through the CMS API, which expires the site's cached home page. */
async function setHeroLayout(value: HeroLayout): Promise<void> {
  await putSetting('heroLayout', value)
}

test.describe('home full-bleed', () => {
  for (const width of FULL_BLEED_WIDTHS) {
    test(`home full-bleed matches at ${width}`, async ({ browser }) => {
      const prototype = await renderPrototype(await browser.newPage(), { route: { page: 'home' }, width })
      const port = await renderPort(await browser.newPage(), { path: '/', width })
      await expectVisualMatch(prototype, port, { name: `home-full-bleed-${width}` })
    })
  }
})

test.describe('home split', () => {
  test.beforeAll(async () => {
    await setHeroLayout('SPLIT')
  })

  test.afterAll(async () => {
    await setHeroLayout('FULL_BLEED')
  })

  for (const width of SPLIT_WIDTHS) {
    test(`home split matches at ${width}`, async ({ browser }) => {
      const prototype = await renderPrototype(await browser.newPage(), { route: { page: 'home' }, width, props: { heroLayout: 'Split' } })
      const port = await renderPort(await browser.newPage(), { path: '/', width })
      await expectVisualMatch(prototype, port, { name: `home-split-${width}` })
    })
  }
})
