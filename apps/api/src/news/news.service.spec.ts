import { tagsFor } from '@arthouz/shared'
import { NewsService } from './news.service'

jest.mock('@arthouz/shared', () => {
  const actual = jest.requireActual('@arthouz/shared')
  return { ...actual, tagsFor: jest.fn(actual.tagsFor) }
})
jest.mock('../common/slugs', () => ({ uniqueSlug: jest.fn().mockResolvedValue('new-news') }))

describe('NewsService rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = { id: 'id-1', slug: 'old-news', title: 'Old', image: null, publishedAt: new Date('2026-05-01') }
    const updated = { ...existing, slug: 'new-news', title: 'New' }
    const prisma = { news: { findUnique: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(updated) } }
    const revalidate = { trigger: jest.fn() }
    const service = new NewsService(prisma as never, revalidate as never)

    await service.update('id-1', { title: 'New', imageId: null } as never)

    const slugs = (tagsFor as jest.Mock).mock.calls.filter(([e]) => e === 'news').map(([, s]) => s)
    expect(slugs).toEqual(expect.arrayContaining(['old-news', 'new-news']))
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })
})
