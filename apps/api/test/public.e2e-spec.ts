import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { z, type ZodType } from 'zod'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  publicAboutSchema, publicArtistDetailSchema, publicArtistListSchema, publicExhibitionDetailSchema,
  publicExhibitionListSchema, publicFairSchema, publicHomeSchema, publicLocationSchema, publicNewsSchema,
  publicSearchSchema, publicSettingsSchema,
} from '@arthouz/shared'
import { PrismaService } from '../src/common/prisma.service'
import { PrismaClient } from '../src/generated/prisma/client'
import { seedDatabase } from '../prisma/seed'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'

const CACHE_CONTROL = 'public, max-age=0, s-maxage=60'
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

describe('public API', () => {
  let app: INestApplication
  let prisma: PrismaService

  const get = (path: string) => request(app.getHttpServer()).get(path)
  async function ok<T>(path: string, schema: ZodType<T>): Promise<T> {
    const res = await get(path).expect(200)
    expect(res.headers['cache-control']).toBe(CACHE_CONTROL)
    return schema.parse(res.body.data)
  }

  const exhibition = (slug: string, over: Record<string, unknown> = {}) =>
    prisma.exhibition.create({
      data: {
        slug, title: slug, city: 'Chennai', country: 'India', type: 'SOLO', startDate: day('2025-01-01'),
        endDate: day('2025-02-01'), isPublished: true, ...over,
      } as never,
    })
  const artist = (slug: string, over: Record<string, unknown> = {}) =>
    prisma.artist.create({ data: { slug, name: slug, sortName: slug, isPublished: true, ...over } as never })

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })
  afterAll(async () => {
    await app.close()
  })

  describe('fixtures', () => {
    beforeEach(resetDb)

    it('unpublished exhibition absent from list, detail 404 and search', async () => {
      await exhibition('visible-show', { title: 'Visible Show' })
      await exhibition('hidden-show', { title: 'Hidden Show', isPublished: false })
      const list = await ok('/public/exhibitions', publicExhibitionListSchema)
      expect(list.items.map((e) => e.slug)).toEqual(['visible-show'])
      await get('/public/exhibitions/hidden-show').expect(404)
      const search = await ok('/public/search?q=Show', publicSearchSchema)
      expect(search.groups).toEqual([{ label: 'Exhibitions', items: [{ label: 'Visible Show', href: '/exhibitions/visible-show' }] }])
    })

    it('unpublished rows never leak through nested artists, works, press, or exhibition links', async () => {
      const shown = await artist('shown-artist')
      const hidden = await artist('hidden-artist', { isPublished: false })
      const ex = await exhibition('mixed')
      const hiddenEx = await exhibition('hidden-ex', { isPublished: false })
      await prisma.exhibitionArtist.createMany({
        data: [
          { exhibitionId: ex.id, artistId: shown.id, sortOrder: 0 },
          { exhibitionId: ex.id, artistId: hidden.id, sortOrder: 1 },
          { exhibitionId: hiddenEx.id, artistId: shown.id, sortOrder: 0 },
        ],
      })
      const media = await prisma.media.create({
        data: { key: 'k1', url: 'https://x/a.jpg', thumbUrl: 'https://x/t.jpg', width: 10, height: 20, mime: 'image/jpeg', bytes: 1, alt: 'alt' },
      })
      await prisma.exhibitionWork.createMany({
        data: [
          { exhibitionId: ex.id, imageId: media.id, title: 'Shown work', artistId: shown.id, sortOrder: 0 },
          { exhibitionId: ex.id, imageId: media.id, title: 'Hidden work', artistId: hidden.id, sortOrder: 1 },
        ],
      })
      await prisma.news.createMany({
        data: [
          { slug: 'p1', title: 'Public press', publishedAt: day('2025-03-01'), isPublished: true, exhibitionId: ex.id },
          { slug: 'p2', title: 'Draft press', publishedAt: day('2025-03-02'), isPublished: false, exhibitionId: ex.id },
          { slug: 'p3', title: 'Link to hidden', publishedAt: day('2025-03-03'), isPublished: true, exhibitionId: hiddenEx.id },
        ],
      })
      await prisma.artwork.createMany({
        data: [
          { artistId: shown.id, title: 'Pub art', isPublished: true, sortOrder: 0 },
          { artistId: shown.id, title: 'Draft art', isPublished: false, sortOrder: 1 },
        ],
      })

      const detail = await ok('/public/exhibitions/mixed', publicExhibitionDetailSchema)
      expect(detail.artists).toEqual([{ name: 'shown-artist', slug: 'shown-artist' }])
      expect(detail.artistLine).toBe('shown-artist')
      expect(detail.works.map((w) => w.title)).toEqual(['Shown work'])
      expect(detail.press.map((p) => p.title)).toEqual(['Public press'])
      expect(detail.works[0]).toMatchObject({ artist: 'shown-artist', image: { url: 'https://x/a.jpg', alt: 'alt' } })

      const art = await ok('/public/artists/shown-artist', publicArtistDetailSchema)
      expect(art.exhibitions.map((e) => e.slug)).toEqual(['mixed'])
      expect(art.works.map((w) => w.title)).toEqual(['Pub art'])
      await get('/public/artists/hidden-artist').expect(404)

      const news = await ok('/public/news', arrayOf(publicNewsSchema))
      expect(news.map((n) => n.title)).toEqual(['Link to hidden', 'Public press'])
      expect(news[0]?.exhibition).toBeNull()
      expect(news[1]?.exhibition).toEqual({ slug: 'mixed', title: 'mixed' })

      const home = await ok('/public/home', publicHomeSchema)
      expect(home.artistsLine).toEqual([{ name: 'shown-artist', slug: 'shown-artist' }])
      expect(home.news.map((n) => n.title)).not.toContain('Draft press')
    })

    it('/public/exhibitions?status=past&city=Chennai filters items but not cities', async () => {
      await exhibition('chennai-past', { city: 'Chennai' })
      await exhibition('mumbai-past', { city: 'Mumbai', startDate: day('2024-01-01'), endDate: day('2024-02-01') })
      await exhibition('chennai-future', { city: 'Chennai', startDate: day('2099-01-01'), endDate: day('2099-02-01') })
      const res = await ok('/public/exhibitions?status=past&city=Chennai', publicExhibitionListSchema)
      expect(res.items.map((e) => e.slug)).toEqual(['chennai-past'])
      expect(res.items[0]).toMatchObject({ status: 'PAST', statusLabel: 'Past', datesLabel: 'January 1 – February 1, 2025' })
      expect(res.cities).toEqual(['Chennai', 'Mumbai'])
      const lower = await ok('/public/exhibitions?city=chennai', publicExhibitionListSchema)
      expect(lower.items.map((e) => e.slug).sort()).toEqual(['chennai-future', 'chennai-past'])
      await get('/public/exhibitions?status=PAST').expect(400)
    })

    it('/public/artists groups K.M. Adimoolam under K, # last, and returns featured and layout', async () => {
      await artist('km', { name: 'K.M. Adimoolam', sortName: 'Adimoolam, K.M.' })
      await prisma.artist.update({ where: { slug: 'km' }, data: { sortName: 'K.M. Adimoolam' } })
      await artist('apple', { name: 'Apple', sortName: 'Apple', isFeatured: true, featuredOrder: 2 })
      await artist('zed', { name: 'Zed', sortName: 'Zed', isFeatured: true, featuredOrder: 1 })
      await artist('num', { name: '3 Dots', sortName: '3 Dots' })
      await artist('draft', { name: 'Draft', sortName: 'Draft', isPublished: false })
      const res = await ok('/public/artists', publicArtistListSchema)
      expect(res.groups.map((g) => g.letter)).toEqual(['A', 'K', 'Z', '#'])
      expect(res.groups.find((g) => g.letter === 'K')?.items.map((a) => a.name)).toEqual(['K.M. Adimoolam'])
      expect(res.featured.map((a) => a.slug)).toEqual(['zed', 'apple'])
      expect(res.flat).toHaveLength(4)
      expect(res.layout).toBe('GROUPED')
      const q = await ok('/public/artists?q=adimo', publicArtistListSchema)
      expect(q.flat.map((a) => a.slug)).toEqual(['km'])
    })

    it('validates query params with 400 fields', async () => {
      const res = await get(`/public/search?q=${'x'.repeat(121)}`).expect(400)
      expect(res.body.error.fields).toBeDefined()
    })

    it('blank search q returns no groups', async () => {
      expect((await ok('/public/search?q=%20%20', publicSearchSchema)).groups).toEqual([])
      expect((await ok('/public/search', publicSearchSchema)).groups).toEqual([])
    })

    it('fairs, locations, about and settings return resolved shapes', async () => {
      const media = await prisma.media.create({
        data: { key: 'k2', url: 'https://x/o.jpg', thumbUrl: 'https://x/ot.jpg', width: 5, height: 5, mime: 'image/jpeg', bytes: 1, alt: 'og' },
      })
      await prisma.fair.createMany({
        data: [
          { slug: 'f1', title: 'Fair', venue: 'Hall', city: 'Delhi', dateLabel: '2022', isPublished: true },
          { slug: 'f2', title: 'Draft fair', isPublished: false },
          { slug: 'f3', title: 'No date', city: 'Delhi', isPublished: true, sortOrder: 1 },
          { slug: 'f4', title: 'No place', dateLabel: '2024', isPublished: true, sortOrder: 2 },
        ],
      })
      await prisma.location.createMany({ data: [{ slug: 'l1', city: 'Chennai', tel: '' }, { slug: 'l2', city: 'Delhi', tel: '+91 1', sortOrder: 1 }] })
      await prisma.setting.createMany({
        data: [
          { key: 'site', value: { title: 'Art Houz', description: 'd', ogImageId: media.id } },
          { key: 'about.gallery', value: { statement: 's', body: 'b', locationsLabel: 'l', imageId: media.id } },
        ],
      })
      const fairs = await ok('/public/fairs', arrayOf(publicFairSchema))
      expect(fairs).toMatchObject([{ slug: 'f1', where: 'Hall, Delhi · 2022' }, { slug: 'f3', where: 'Delhi' }, { slug: 'f4', where: '2024' }])
      const locations = await ok('/public/locations', arrayOf(publicLocationSchema))
      expect(locations.map((l) => l.tel)).toEqual([null, '+91 1'])
      const about = await ok('/public/about', publicAboutSchema)
      expect(about.gallery.image).toEqual({ url: 'https://x/o.jpg', thumbUrl: 'https://x/ot.jpg', width: 5, height: 5, alt: 'og' })
      expect(about.proprietor.image).toBeNull()
      const settings = await ok('/public/settings', publicSettingsSchema)
      expect(settings).toMatchObject({ heroLayout: 'FULL_BLEED', artistIndexLayout: 'GROUPED', site: { title: 'Art Houz', ogImage: { alt: 'og' } } })
    })

    it('exhibition detail meta and Format', async () => {
      await exhibition('grp', { type: 'GROUP', venue: 'Main Hall', city: 'Chennai', country: 'India', datesLabel: 'Spring 2025' })
      const d = await ok('/public/exhibitions/grp', publicExhibitionDetailSchema)
      expect(d.meta).toEqual([
        { k: 'Location', v: 'Chennai, India' }, { k: 'Venue', v: 'Main Hall' },
        { k: 'Dates', v: 'Spring 2025' }, { k: 'Format', v: 'Group exhibition' },
      ])
    })
  })

  describe('seeded prototype content', () => {
    beforeAll(async () => {
      await resetDb()
      const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST }) })
      try {
        await seedDatabase(client, { adminEmail: 'admin@example.com', adminPassword: 'change-me-now-please' })
      } finally {
        await client.$disconnect()
      }
    })

    it('/public/home parses and has hero, locations and 3 news', async () => {
      const home = await ok('/public/home', publicHomeSchema)
      expect(home.hero).not.toBeNull()
      expect(home.news).toHaveLength(3)
      expect(home.locations.length).toBeGreaterThan(0)
      expect(home.recent.length).toBeLessThanOrEqual(3)
      expect(home.world.every((e) => e.country !== 'India')).toBe(true)
    })

    it('/public/search?q=நான் returns the Tamil news item under News', async () => {
      const res = await ok(`/public/search?q=${encodeURIComponent('நான்')}`, publicSearchSchema)
      const news = res.groups.find((g) => g.label === 'News')
      expect(news?.items.length).toBeGreaterThan(0)
      expect(news?.items[0]?.href).toBe('/news')
      expect(news?.items[0]?.label).toContain('நான்')
    })

    it('/public/search?q=Pichumani returns artist and 3 exhibitions', async () => {
      const res = await ok('/public/search?q=Pichumani', publicSearchSchema)
      const artists = res.groups.find((g) => g.label === 'Artists')
      const exhibitions = res.groups.find((g) => g.label === 'Exhibitions')
      expect(artists?.items).toHaveLength(1)
      expect(artists?.items[0]?.href).toMatch(/^\/artists\//)
      expect(exhibitions?.items).toHaveLength(3)
    })

    it('list and detail routes parse for seeded data', async () => {
      const list = await ok('/public/exhibitions', publicExhibitionListSchema)
      expect(list.items.length).toBeGreaterThan(0)
      await ok(`/public/exhibitions/${list.items[0]?.slug}`, publicExhibitionDetailSchema)
      const artists = await ok('/public/artists', publicArtistListSchema)
      await ok(`/public/artists/${artists.flat[0]?.slug}`, publicArtistDetailSchema)
      await ok('/public/about', publicAboutSchema)
    })
  })
})

function arrayOf<T>(item: ZodType<T>): ZodType<T[]> {
  return z.array(item) as unknown as ZodType<T[]>
}
