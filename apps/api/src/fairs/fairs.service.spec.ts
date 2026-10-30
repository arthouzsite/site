import { tagsFor } from '@arthouz/shared'
import { FairsService } from './fairs.service'

jest.mock('@arthouz/shared', () => {
  const actual = jest.requireActual('@arthouz/shared')
  return { ...actual, tagsFor: jest.fn(actual.tagsFor) }
})
jest.mock('../common/slugs', () => ({ uniqueSlug: jest.fn().mockResolvedValue('new-fair') }))

describe('FairsService rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, venue: '', city: '', dateLabel: '' }
    const updated = { ...existing, slug: 'new-fair', title: 'New' }
    const prisma = { fair: { findUnique: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(updated) } }
    const revalidate = { trigger: jest.fn() }
    const service = new FairsService(prisma as never, revalidate as never)

    await service.update('id-1', { title: 'New', imageId: null } as never)

    const slugs = (tagsFor as jest.Mock).mock.calls.filter(([e]) => e === 'fair').map(([, s]) => s)
    expect(slugs).toEqual(expect.arrayContaining(['old-fair', 'new-fair']))
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })
})
