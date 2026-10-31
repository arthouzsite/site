import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { exhibitionFanOutTags, exhibitionTagsWithArtists, linkedArtistSlugs } from './related-tags'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

function prismaWithLinks(slugs: string[]): PrismaClient {
  const findMany = vi.fn(async () => slugs.map((slug) => ({ artist: { slug } })))
  return { exhibitionArtist: { findMany } } as unknown as PrismaClient
}

function failingPrisma(): PrismaClient {
  return { exhibitionArtist: { findMany: vi.fn(async () => Promise.reject(new Error('db down'))) } } as unknown as PrismaClient
}

describe('exhibitionFanOutTags', () => {
  it('combines exhibition and artist tags without duplicates', () => {
    const tags = exhibitionFanOutTags(['show', 'show'], ['ana'])
    expect(tags).toEqual(expect.arrayContaining(['exhibitions', 'exhibition:show', 'artists', 'artist:ana']))
    expect(new Set(tags).size).toBe(tags.length)
  })
})

describe('linkedArtistSlugs', () => {
  it('returns the slugs of the linked artists', async () => {
    await expect(linkedArtistSlugs(prismaWithLinks(['ana', 'bob']), 'e1')).resolves.toEqual(['ana', 'bob'])
  })

  it('returns an empty list when the lookup fails, so the write still succeeds', async () => {
    await expect(linkedArtistSlugs(failingPrisma(), 'e1')).resolves.toEqual([])
  })
})

describe('exhibitionTagsWithArtists', () => {
  it('adds linked and extra artist tags to the exhibition tags', async () => {
    const tags = await exhibitionTagsWithArtists(prismaWithLinks(['ana']), 'e1', ['show'], ['bob'])
    expect(tags).toEqual(expect.arrayContaining(['exhibition:show', 'artist:ana', 'artist:bob']))
  })

  it('still returns the exhibition tags when the artist lookup fails', async () => {
    const tags = await exhibitionTagsWithArtists(failingPrisma(), 'e1', ['show'])
    expect(tags).toContain('exhibition:show')
  })
})
