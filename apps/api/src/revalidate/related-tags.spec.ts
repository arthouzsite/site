import { Logger } from '@nestjs/common'
import type { PrismaService } from '../common/prisma.service'
import {
  artistFanOutTags,
  artistSlugsByIds,
  artistTagsWithExhibitions,
  exhibitionFanOutTags,
  exhibitionSlugsByIds,
  exhibitionTagsWithArtists,
  linkedArtistSlugs,
  linkedExhibitionSlugs,
  mediaUsageTags,
} from './related-tags'

const fakePrisma = (overrides: Record<string, unknown> = {}) => {
  const model = (rows: unknown[] = []) => ({ findMany: jest.fn().mockResolvedValue(rows) })
  return {
    exhibitionArtist: model(),
    exhibition: model(),
    exhibitionWork: model(),
    artist: model(),
    artwork: model(),
    ...overrides,
  } as unknown as PrismaService
}

describe('pure tag builders', () => {
  it('exhibitionFanOutTags adds exhibition and artist page tags without duplicates', () => {
    const tags = exhibitionFanOutTags(['old', 'new', 'old'], ['aa', 'bb', 'aa'])
    expect(tags).toEqual(expect.arrayContaining(['exhibition:old', 'exhibition:new', 'artist:aa', 'artist:bb', 'exhibitions', 'artists', 'home']))
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('artistFanOutTags adds artist and exhibition page tags', () => {
    expect(artistFanOutTags(['aa', 'zed'], ['sea'])).toEqual(expect.arrayContaining(['artist:aa', 'artist:zed', 'exhibition:sea']))
  })

  it('returns only the base tags when no slugs are given', () => {
    expect(exhibitionFanOutTags([], [])).toEqual([])
  })
})

describe('lookups', () => {
  it('linkedArtistSlugs and linkedExhibitionSlugs read the join table', async () => {
    const prisma = fakePrisma({
      exhibitionArtist: {
        findMany: jest.fn()
          .mockResolvedValueOnce([{ artist: { slug: 'aa' } }])
          .mockResolvedValueOnce([{ exhibition: { slug: 'sea' } }]),
      },
    })
    expect(await linkedArtistSlugs(prisma, 'e1')).toEqual(['aa'])
    expect(await linkedExhibitionSlugs(prisma, 'a1')).toEqual(['sea'])
  })

  it('artistSlugsByIds and exhibitionSlugsByIds resolve slugs; null ids are ignored', async () => {
    const prisma = fakePrisma({
      artist: { findMany: jest.fn().mockResolvedValue([{ slug: 'aa' }]) },
      exhibition: { findMany: jest.fn().mockResolvedValue([{ slug: 'sea' }]) },
    })
    expect(await artistSlugsByIds(prisma, ['a1'])).toEqual(['aa'])
    expect(await exhibitionSlugsByIds(prisma, [null, undefined, 'e1', 'e1'])).toEqual(['sea'])
    expect(await exhibitionSlugsByIds(prisma, [null])).toEqual([])
  })

  it('a failing lookup is swallowed and logged, never thrown', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    const prisma = fakePrisma({ exhibitionArtist: { findMany: jest.fn().mockRejectedValue(new Error('db down')) } })
    expect(await linkedArtistSlugs(prisma, 'e1')).toEqual([])
    expect(await exhibitionTagsWithArtists(prisma, 'e1', ['sea'])).toEqual(expect.arrayContaining(['exhibition:sea']))
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('exhibitionTagsWithArtists merges linked and extra artist slugs', async () => {
    const prisma = fakePrisma({ exhibitionArtist: { findMany: jest.fn().mockResolvedValue([{ artist: { slug: 'aa' } }]) } })
    expect(await exhibitionTagsWithArtists(prisma, 'e1', ['sea'], ['gone'])).toEqual(
      expect.arrayContaining(['exhibition:sea', 'artist:aa', 'artist:gone']),
    )
  })

  it('artistTagsWithExhibitions merges the artist slugs with their exhibitions', async () => {
    const prisma = fakePrisma({ exhibitionArtist: { findMany: jest.fn().mockResolvedValue([{ exhibition: { slug: 'sea' } }]) } })
    expect(await artistTagsWithExhibitions(prisma, 'a1', ['aa', 'old-aa'])).toEqual(
      expect.arrayContaining(['artist:aa', 'artist:old-aa', 'exhibition:sea']),
    )
  })
})

describe('mediaUsageTags', () => {
  it('maps every usage type to the tags of the pages that render it', async () => {
    const prisma = fakePrisma({
      exhibition: { findMany: jest.fn().mockResolvedValue([{ slug: 'sea', artists: [{ artist: { slug: 'aa' } }] }]) },
      exhibitionWork: { findMany: jest.fn().mockResolvedValue([{ exhibition: { slug: 'work-show' }, artist: { slug: 'bb' } }]) },
      artist: { findMany: jest.fn().mockResolvedValue([{ slug: 'cc', exhibitions: [{ exhibition: { slug: 'cc-show' } }] }]) },
      artwork: { findMany: jest.fn().mockResolvedValue([{ artist: { slug: 'dd' } }]) },
    })
    const tags = await mediaUsageTags(prisma, [
      { type: 'exhibition', id: 'e1', title: 'Sea' },
      { type: 'exhibitionWork', id: 'w1', title: 'W' },
      { type: 'artist', id: 'a1', title: 'C' },
      { type: 'artwork', id: 'k1', title: 'K' },
      { type: 'fair', id: 'f1', title: 'F' },
      { type: 'news', id: 'n1', title: 'N' },
      { type: 'location', id: 'l1', title: 'L' },
      { type: 'setting', id: 'site', title: 'Site social image' },
    ])
    expect(tags).toEqual(
      expect.arrayContaining([
        'exhibition:sea', 'artist:aa', 'exhibition:work-show', 'artist:bb', 'artist:cc', 'exhibition:cc-show', 'artist:dd',
        'fairs', 'news', 'locations', 'settings', 'about',
      ]),
    )
  })

  it('returns no tags for no usage and ignores unknown types', async () => {
    expect(await mediaUsageTags(fakePrisma(), [])).toEqual([])
    expect(await mediaUsageTags(fakePrisma(), [{ type: 'mystery', id: 'x', title: 'x' }])).toEqual([])
  })

  it('survives a failing lookup for one type', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    const prisma = fakePrisma({ exhibition: { findMany: jest.fn().mockRejectedValue(new Error('boom')) } })
    expect(await mediaUsageTags(prisma, [{ type: 'exhibition', id: 'e1', title: 'x' }, { type: 'fair', id: 'f1', title: 'F' }])).toEqual(
      expect.arrayContaining(['fairs']),
    )
    warn.mockRestore()
  })
})
