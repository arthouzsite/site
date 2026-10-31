import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  publicAboutSchema, publicArtistDetailSchema, publicArtistListSchema, publicExhibitionDetailSchema,
  publicExhibitionListSchema, publicFairSchema, publicHomeSchema, publicLocationSchema, publicNewsSchema,
  publicSearchSchema, publicSettingsSchema,
} from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { arrayOf, day, ok } from './helpers/public'

// Public statuses follow the clock; pin it so seeded and fixture dates cannot drift.
vi.mock('@/lib/server/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))

describe('public API', () => {
  const get = (path: string) => call('GET', path)

  const exhibition = (slug: string, over: Record<string, unknown> = {}) =>
    prisma.exhibition.create({
      data: {
        slug, title: slug, city: 'Chennai', country: 'India', type: 'SOLO', startDate: day('2025-01-01'),
        endDate: day('2025-02-01'), isPublished: true, ...over,
      } as never,
    })
  const artist = (slug: string, over: Record<string, unknown> = {}) =>
    prisma.artist.create({ data: { slug, name: slug, sortName: slug, isPublished: true, ...over } as never })

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(resetDb)
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('unpublished exhibition absent from list, detail 404 and search', async () => {
    await exhibition('visible-show', { title: 'Visible Show' })
    await exhibition('hidden-show', { title: 'Hidden Show', isPublished: false })
    const list = await ok('/api/public/exhibitions', publicExhibitionListSchema)
    expect(list.items.map((e) => e.slug)).toEqual(['visible-show'])
    const hidden = await get('/api/public/exhibitions/hidden-show')
    expect(hidden.status).toBe(404)
    expect(hidden.body.error.code).toBe('NOT_FOUND')
    const search = await ok('/api/public/search?q=Show', publicSearchSchema)
    expect(search.groups).toEqual([{ label: 'Exhibitions', items: [{ label: 'Visible Show', href: '/exhibitions/visible-show' }] }])
  })

  it('exhibition detail never lists a work whose image is a video', async () => {
    const a = await artist('film-artist')
    const ex = await exhibition('film-show')
    await prisma.exhibitionArtist.create({ data: { exhibitionId: ex.id, artistId: a.id, sortOrder: 0 } })
    const image = await prisma.media.create({
      data: { key: 'i1', url: 'https://x/i.jpg', thumbUrl: 'https://x/t.jpg', width: 10, height: 10, mime: 'image/jpeg', bytes: 1, alt: 'i' },
    })
    const video = await prisma.media.create({
      data: { key: 'v1', url: 'https://x/v.mp4', thumbUrl: 'https://x/v.mp4', width: 0, height: 0, mime: 'video/mp4', kind: 'VIDEO', bytes: 1, alt: 'v' },
    })
    await prisma.exhibitionWork.createMany({
      data: [
        { exhibitionId: ex.id, imageId: image.id, title: 'Still', artistId: a.id, sortOrder: 0 },
        { exhibitionId: ex.id, imageId: video.id, title: 'Film', artistId: a.id, sortOrder: 1 },
      ],
    })
    const detail = await ok('/api/public/exhibitions/film-show', publicExhibitionDetailSchema)
    expect(detail.works.map((w) => w.title)).toEqual(['Still'])
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

    const detail = await ok('/api/public/exhibitions/mixed', publicExhibitionDetailSchema)
    expect(detail.artists).toEqual([{ name: 'shown-artist', slug: 'shown-artist' }])
    expect(detail.artistLine).toBe('shown-artist')
    expect(detail.works.map((w) => w.title)).toEqual(['Shown work'])
    expect(detail.press.map((p) => p.title)).toEqual(['Public press'])
    expect(detail.works[0]).toMatchObject({ artist: 'shown-artist', image: { url: 'https://x/a.jpg', alt: 'alt' } })

    const art = await ok('/api/public/artists/shown-artist', publicArtistDetailSchema)
    expect(art.exhibitions.map((e) => e.slug)).toEqual(['mixed'])
    expect(art.works.map((w) => w.title)).toEqual(['Pub art'])
    expect((await get('/api/public/artists/hidden-artist')).status).toBe(404)

    const news = await ok('/api/public/news', arrayOf(publicNewsSchema))
    expect(news.map((n) => n.title)).toEqual(['Link to hidden', 'Public press'])
    expect(news[0]?.exhibition).toBeNull()
    expect(news[1]?.exhibition).toEqual({ slug: 'mixed', title: 'mixed' })

    const home = await ok('/api/public/home', publicHomeSchema)
    expect(home.artistsLine).toEqual([{ name: 'shown-artist', slug: 'shown-artist' }])
    expect(home.news.map((n) => n.title)).not.toContain('Draft press')
  })

  it('/api/public/exhibitions?status=past&city=Chennai filters items but not cities', async () => {
    await exhibition('chennai-past', { city: 'Chennai' })
    await exhibition('mumbai-past', { city: 'Mumbai', startDate: day('2024-01-01'), endDate: day('2024-02-01') })
    await exhibition('chennai-future', { city: 'Chennai', startDate: day('2099-01-01'), endDate: day('2099-02-01') })
    const res = await ok('/api/public/exhibitions?status=past&city=Chennai', publicExhibitionListSchema)
    expect(res.items.map((e) => e.slug)).toEqual(['chennai-past'])
    expect(res.items[0]).toMatchObject({ status: 'PAST', statusLabel: 'Past', datesLabel: 'January 1 – February 1, 2025' })
    expect(res.cities).toEqual(['Chennai', 'Mumbai'])
    const lower = await ok('/api/public/exhibitions?city=chennai', publicExhibitionListSchema)
    expect(lower.items.map((e) => e.slug).sort()).toEqual(['chennai-future', 'chennai-past'])
    expect((await get('/api/public/exhibitions?status=PAST')).status).toBe(400)
  })

  it('/api/public/artists groups K.M. Adimoolam under K, # last, and returns featured and layout', async () => {
    await artist('km', { name: 'K.M. Adimoolam', sortName: 'Adimoolam, K.M.' })
    await prisma.artist.update({ where: { slug: 'km' }, data: { sortName: 'K.M. Adimoolam' } })
    await artist('apple', { name: 'Apple', sortName: 'Apple', isFeatured: true, featuredOrder: 2 })
    await artist('zed', { name: 'Zed', sortName: 'Zed', isFeatured: true, featuredOrder: 1 })
    await artist('num', { name: '3 Dots', sortName: '3 Dots' })
    await artist('draft', { name: 'Draft', sortName: 'Draft', isPublished: false })
    const res = await ok('/api/public/artists', publicArtistListSchema)
    expect(res.groups.map((g) => g.letter)).toEqual(['A', 'K', 'Z', '#'])
    expect(res.groups.find((g) => g.letter === 'K')?.items.map((a) => a.name)).toEqual(['K.M. Adimoolam'])
    expect(res.featured.map((a) => a.slug)).toEqual(['zed', 'apple'])
    expect(res.flat).toHaveLength(4)
    expect(res.layout).toBe('GROUPED')
    const q = await ok('/api/public/artists?q=adimo', publicArtistListSchema)
    expect(q.flat.map((a) => a.slug)).toEqual(['km'])
  })

  it('validates query params with 400 fields', async () => {
    const res = await get(`/api/public/search?q=${'x'.repeat(121)}`)
    expect(res.status).toBe(400)
    expect(res.body.error.fields).toBeDefined()
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
    const fairs = await ok('/api/public/fairs', arrayOf(publicFairSchema))
    expect(fairs).toMatchObject([{ slug: 'f1', where: 'Hall, Delhi · 2022' }, { slug: 'f3', where: 'Delhi' }, { slug: 'f4', where: '2024' }])
    const locations = await ok('/api/public/locations', arrayOf(publicLocationSchema))
    expect(locations.map((l) => l.tel)).toEqual([null, '+91 1'])
    const about = await ok('/api/public/about', publicAboutSchema)
    expect(about.gallery.image).toEqual({ url: 'https://x/o.jpg', thumbUrl: 'https://x/ot.jpg', width: 5, height: 5, alt: 'og' })
    expect(about.proprietor.image).toBeNull()
    const settings = await ok('/api/public/settings', publicSettingsSchema)
    expect(settings).toMatchObject({ heroLayout: 'FULL_BLEED', artistIndexLayout: 'GROUPED', site: { title: 'Art Houz', ogImage: { alt: 'og' } } })
  })

  it('exhibition detail meta and Format', async () => {
    await exhibition('grp', { type: 'GROUP', venue: 'Main Hall', city: 'Chennai', country: 'India', datesLabel: 'Spring 2025' })
    const d = await ok('/api/public/exhibitions/grp', publicExhibitionDetailSchema)
    expect(d.meta).toEqual([
      { k: 'Location', v: 'Chennai, India' }, { k: 'Venue', v: 'Main Hall' },
      { k: 'Dates', v: 'Spring 2025' }, { k: 'Format', v: 'Group exhibition' },
    ])
  })
})
