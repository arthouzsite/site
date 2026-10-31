import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'
import { exhibitionSlugsByIds, exhibitionTagsForSlugs } from './exhibition-tags'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

const clientWith = (findMany: ReturnType<typeof vi.fn>) => ({ exhibition: { findMany } }) as unknown as PrismaClient

describe('exhibitionTagsForSlugs', () => {
  it('adds the exhibition page tags without duplicates', () => {
    const tags = exhibitionTagsForSlugs(['old', 'new', 'old'])
    expect(tags).toEqual(expect.arrayContaining(['exhibition:old', 'exhibition:new', 'exhibitions']))
    expect(new Set(tags).size).toBe(tags.length)
  })

  it('is empty for no slugs', () => {
    expect(exhibitionTagsForSlugs([])).toEqual([])
  })
})

describe('exhibitionSlugsByIds', () => {
  it('skips the query when there are no ids', async () => {
    const findMany = vi.fn()
    expect(await exhibitionSlugsByIds(clientWith(findMany), [null, undefined, ''])).toEqual([])
    expect(findMany).not.toHaveBeenCalled()
  })

  it('looks up each distinct id once', async () => {
    const findMany = vi.fn().mockResolvedValue([{ slug: 'a' }, { slug: 'b' }])
    expect(await exhibitionSlugsByIds(clientWith(findMany), ['1', '2', '1', null])).toEqual(['a', 'b'])
    expect(findMany).toHaveBeenCalledWith({ where: { id: { in: ['1', '2'] } }, select: { slug: true } })
  })

  it('logs and returns nothing when the lookup fails', async () => {
    const findMany = vi.fn().mockRejectedValue(new Error('db down'))
    expect(await exhibitionSlugsByIds(clientWith(findMany), ['1'])).toEqual([])
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('db down'))
  })
})
