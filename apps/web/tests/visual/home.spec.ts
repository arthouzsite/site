import { createRequire } from 'node:module'
import path from 'node:path'
import { test } from '@playwright/test'
import { PrismaClient } from '../../../api/src/generated/prisma/client'
import { API_DIR, VISUAL_DATABASE_URL, VISUAL_REVALIDATE_SECRET } from './env'
import { expectVisualMatch, renderPort, renderPrototype } from './harness'
import { PORT_URL } from './paths'

const FULL_BLEED_WIDTHS = [375, 768, 1024, 1440] as const
const SPLIT_WIDTHS = [1440, 375] as const
const HERO_LAYOUT_KEY = 'heroLayout'
const HOME_TAGS = ['home', 'settings'] as const

type HeroLayout = 'FULL_BLEED' | 'SPLIT'
type DriverAdapter = NonNullable<NonNullable<ConstructorParameters<typeof PrismaClient>[0]>['adapter']>
type PgAdapterModule = { PrismaPg: new (config: { connectionString: string }) => DriverAdapter }

// The pg driver adapter is an apps/api dependency, so resolve it from there rather than adding it to apps/web.
const { PrismaPg } = createRequire(path.join(API_DIR, 'package.json'))('@prisma/adapter-pg') as PgAdapterModule

/** Writes the hero layout straight into the visual database, then expires the site's cached home page. */
async function setHeroLayout(value: HeroLayout): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: VISUAL_DATABASE_URL }) })
  try {
    await prisma.setting.upsert({ where: { key: HERO_LAYOUT_KEY }, create: { key: HERO_LAYOUT_KEY, value }, update: { value } })
  } finally {
    await prisma.$disconnect()
  }
  const response = await fetch(`${PORT_URL}/api/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': VISUAL_REVALIDATE_SECRET },
    body: JSON.stringify({ tags: HOME_TAGS }),
  })
  if (!response.ok) throw new Error(`home visual: revalidate failed with HTTP ${response.status}`)
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
