import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  publicAboutSchema, publicArtistDetailSchema, publicArtistListSchema, publicExhibitionDetailSchema,
  publicExhibitionListSchema, publicHomeSchema, publicSearchSchema,
} from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { seedDatabase } from '@/prisma/seed'
import { migrateTestDb, resetDb } from './helpers/db'
import { ok } from './helpers/public'

// The prototype content is dated around this day; pin the clock so statuses do not drift.
vi.mock('@/lib/server/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))

describe('public API on seeded prototype content', () => {
  beforeAll(async () => {
    migrateTestDb()
    await resetDb()
    await seedDatabase(prisma, { adminEmail: 'admin@example.com', adminPassword: 'change-me-now-please' })
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('/api/public/home parses and has hero, locations and 3 news', async () => {
    const home = await ok('/api/public/home', publicHomeSchema)
    expect(home.hero).not.toBeNull()
    expect(home.news).toHaveLength(3)
    expect(home.locations.length).toBeGreaterThan(0)
    expect(home.recent.length).toBeLessThanOrEqual(3)
    expect(home.world.every((e) => e.country !== 'India')).toBe(true)
  })

  it('/api/public/search?q=நான் returns the Tamil news item under News', async () => {
    const res = await ok(`/api/public/search?q=${encodeURIComponent('நான்')}`, publicSearchSchema)
    const news = res.groups.find((g) => g.label === 'News')
    expect(news?.items.length).toBeGreaterThan(0)
    expect(news?.items[0]?.href).toBe('/news')
    expect(news?.items[0]?.label).toContain('நான்')
  })

  it('/api/public/search?q=Pichumani returns artist and 3 exhibitions', async () => {
    const res = await ok('/api/public/search?q=Pichumani', publicSearchSchema)
    const artists = res.groups.find((g) => g.label === 'Artists')
    const exhibitions = res.groups.find((g) => g.label === 'Exhibitions')
    expect(artists?.items).toHaveLength(1)
    expect(artists?.items[0]?.href).toMatch(/^\/artists\//)
    expect(exhibitions?.items).toHaveLength(3)
  })

  it('blank search q returns no groups', async () => {
    expect((await ok('/api/public/search?q=%20%20', publicSearchSchema)).groups).toEqual([])
    expect((await ok('/api/public/search', publicSearchSchema)).groups).toEqual([])
  })

  it('orders exhibitions current, upcoming, then past by start date, and cities by first appearance', async () => {
    const list = await ok('/api/public/exhibitions', publicExhibitionListSchema)
    expect(list.items.slice(0, 3).map((e) => e.slug)).toEqual(['tidewater', 'weight-of-light', 'quiet-matter'])
    expect(list.cities).toEqual(['Chennai', 'Dubai', 'Singapore', 'London', 'Bengaluru'])
  })

  it('list and detail routes parse for seeded data', async () => {
    const list = await ok('/api/public/exhibitions', publicExhibitionListSchema)
    expect(list.items.length).toBeGreaterThan(0)
    await ok(`/api/public/exhibitions/${list.items[0]?.slug}`, publicExhibitionDetailSchema)
    const artists = await ok('/api/public/artists', publicArtistListSchema)
    await ok(`/api/public/artists/${artists.flat[0]?.slug}`, publicArtistDetailSchema)
    await ok('/api/public/about', publicAboutSchema)
  })
})
