import { describe, expect, it, vi } from 'vitest'
import { tagsFor } from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { newsService } from './news.service'

vi.mock('@/lib/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared')>()
  return { ...actual, tagsFor: vi.fn(actual.tagsFor) }
})
vi.mock('@/lib/server/common/slugs', () => ({ uniqueSlug: vi.fn().mockResolvedValue('new-news') }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({ prisma: { news: { findUnique: vi.fn(), update: vi.fn() } } }))

describe('newsService rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = { id: 'id-1', slug: 'old-news', title: 'Old', image: null, publishedAt: new Date('2026-05-01'), exhibitionId: null }
    const updated = { ...existing, slug: 'new-news', title: 'New' }
    vi.mocked(prisma.news.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.news.update).mockResolvedValue(updated as never)

    await newsService.update('id-1', { title: 'New', imageId: null } as never)

    const slugs = vi.mocked(tagsFor).mock.calls.filter(([entity]) => entity === 'news').map(([, slug]) => slug)
    expect(slugs).toEqual(expect.arrayContaining(['old-news', 'new-news']))
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })
})
