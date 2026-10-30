import { createRequire } from 'node:module'
import path from 'node:path'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { PrismaClient } from '../../../api/src/generated/prisma/client'
import { API_DIR, VISUAL_DATABASE_URL, VISUAL_REVALIDATE_SECRET } from './env'
import { expectVisualMatch, renderPort, renderPrototype, type PrototypeProps, type PrototypeRoute } from './harness'
import { PORT_URL } from './paths'

const WIDTHS = [375, 768, 1024, 1440] as const
const DESKTOP = 1440
const LAYOUT_KEY = 'artistIndexLayout'
const ARTIST_TAGS = ['artists', 'settings'] as const

type Layout = 'GROUPED' | 'FLOWING'
type DriverAdapter = NonNullable<NonNullable<ConstructorParameters<typeof PrismaClient>[0]>['adapter']>
type PgAdapterModule = { PrismaPg: new (config: { connectionString: string }) => DriverAdapter }

// The pg driver adapter is an apps/api dependency, so resolve it from there rather than adding it to apps/web.
const { PrismaPg } = createRequire(path.join(API_DIR, 'package.json'))('@prisma/adapter-pg') as PgAdapterModule

async function setArtistIndexLayout(value: Layout): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: VISUAL_DATABASE_URL }) })
  try {
    await prisma.setting.upsert({ where: { key: LAYOUT_KEY }, create: { key: LAYOUT_KEY, value }, update: { value } })
  } finally {
    await prisma.$disconnect()
  }
  const response = await fetch(`${PORT_URL}/api/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': VISUAL_REVALIDATE_SECRET },
    body: JSON.stringify({ tags: ARTIST_TAGS }),
  })
  if (!response.ok) throw new Error(`artists visual: revalidate failed with HTTP ${response.status}`)
}

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

// The prototype keeps the search box text in route state as `aq`; the harness type does not list it, so build the route as a variable.
function searchRoute(aq: string): PrototypeRoute {
  const route = { page: 'artists', aq }
  return route
}

test.describe('artists grouped', () => {
  for (const width of WIDTHS) {
    test(`artists grouped matches at ${width}`, async ({ browser }) => {
      await compare(browser, `artists-grouped-${width}`, { page: 'artists' }, '/artists', width)
    })
  }

  test(`artists?q=pich shows only matches`, async ({ browser }) => {
    await compare(browser, `artists-q-pich-${DESKTOP}`, searchRoute('pich'), '/artists?q=pich', DESKTOP)
  })

  test(`artists?q=zzz shows the empty state`, async ({ browser }) => {
    const portPage = await compare(browser, `artists-q-zzz-${DESKTOP}`, searchRoute('zzz'), '/artists?q=zzz', DESKTOP)
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
