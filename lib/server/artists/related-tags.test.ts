import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { describe, expect, it, vi } from 'vitest'
import * as log from '@/lib/server/log'
import { artistFanOutTags, artistTagsWithExhibitions, linkedExhibitionSlugs } from './related-tags'

function fakePrisma(findMany: () => Promise<unknown[]>) {
  return { exhibitionArtist: { findMany: vi.fn(findMany) } } as unknown as PrismaClient
}

describe('artistFanOutTags', () => {
  it('adds artist and exhibition page tags without duplicates', () => {
    const tags = artistFanOutTags(['aa', 'zed', 'aa'], ['sea'])
    expect(tags).toEqual(expect.arrayContaining(['artist:aa', 'artist:zed', 'exhibition:sea']))
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('returns no tags when no slugs are given', () => {
    expect(artistFanOutTags([], [])).toEqual([])
  })
})

describe('linkedExhibitionSlugs', () => {
  it('reads the exhibition slugs from the join table', async () => {
    const prisma = fakePrisma(async () => [{ exhibition: { slug: 'sea' } }])
    expect(await linkedExhibitionSlugs(prisma, 'a1')).toEqual(['sea'])
  })

  it('swallows and logs a failing lookup instead of throwing', async () => {
    const logged = vi.spyOn(log, 'logError').mockImplementation(() => undefined)
    const prisma = fakePrisma(async () => {
      throw new Error('db down')
    })
    expect(await linkedExhibitionSlugs(prisma, 'a1')).toEqual([])
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('exhibitions of artist'))
    logged.mockRestore()
  })
})

describe('artistTagsWithExhibitions', () => {
  it('merges the artist slugs with their exhibitions', async () => {
    const prisma = fakePrisma(async () => [{ exhibition: { slug: 'sea' } }])
    expect(await artistTagsWithExhibitions(prisma, 'a1', ['aa', 'old-aa'])).toEqual(
      expect.arrayContaining(['artist:aa', 'artist:old-aa', 'exhibition:sea']),
    )
  })

  it('still returns the artist tags when the lookup fails', async () => {
    const logged = vi.spyOn(log, 'logError').mockImplementation(() => undefined)
    const prisma = fakePrisma(async () => {
      throw new Error('db down')
    })
    expect(await artistTagsWithExhibitions(prisma, 'a1', ['aa'])).toEqual(expect.arrayContaining(['artist:aa']))
    logged.mockRestore()
  })
})
