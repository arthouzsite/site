import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { allSiteTags } from './all-tags'

vi.mock('@/lib/server/prisma', () => ({
  prisma: {
    exhibition: { findMany: vi.fn() },
    artist: { findMany: vi.fn() },
    service: { findMany: vi.fn() },
    news: { findMany: vi.fn() },
  },
}))

const rows = (...slugs: string[]) => slugs.map((slug) => ({ slug }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.exhibition.findMany).mockResolvedValue(rows('spring-show', 'autumn-show') as never)
  vi.mocked(prisma.artist.findMany).mockResolvedValue(rows('jane-doe') as never)
  vi.mocked(prisma.service.findMany).mockResolvedValue(rows('advisory') as never)
  vi.mocked(prisma.news.findMany).mockResolvedValue(rows('press-note') as never)
})

describe('allSiteTags', () => {
  it('includes every entity-level tag', async () => {
    const tags = await allSiteTags()
    expect(tags).toEqual(expect.arrayContaining(['home', 'search', 'exhibitions', 'artists', 'fairs', 'services', 'news', 'locations', 'about', 'settings']))
  })

  it('adds the per-slug tags for exhibitions, artists and services', async () => {
    const tags = await allSiteTags()
    expect(tags).toEqual(expect.arrayContaining(['exhibition:spring-show', 'exhibition:autumn-show', 'artist:jane-doe', 'service:advisory']))
  })

  it('has no per-slug tag for news (tagsFor yields none) and no duplicates', async () => {
    const tags = await allSiteTags()
    expect(tags.some((tag) => tag.includes('press-note'))).toBe(false)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('queries only the slug column', async () => {
    await allSiteTags()
    for (const model of [prisma.exhibition, prisma.artist, prisma.service, prisma.news]) {
      expect(model.findMany).toHaveBeenCalledWith({ select: { slug: true } })
    }
  })
})
