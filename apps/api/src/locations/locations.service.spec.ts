import { tagsFor } from '@arthouz/shared'
import { LocationsService } from './locations.service'

jest.mock('@arthouz/shared', () => {
  const actual = jest.requireActual('@arthouz/shared')
  return { ...actual, tagsFor: jest.fn(actual.tagsFor) }
})
jest.mock('../common/slugs', () => ({ uniqueSlug: jest.fn().mockResolvedValue('new-city') }))

describe('LocationsService rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on city change', async () => {
    const existing = { id: 'id-1', slug: 'old-city', city: 'Old', image: null }
    const updated = { ...existing, slug: 'new-city', city: 'New' }
    const prisma = { location: { findUnique: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(updated) } }
    const revalidate = { trigger: jest.fn() }
    const service = new LocationsService(prisma as never, revalidate as never)

    await service.update('id-1', { city: 'New', imageId: null } as never)

    const slugs = (tagsFor as jest.Mock).mock.calls.filter(([e]) => e === 'location').map(([, s]) => s)
    expect(slugs).toEqual(expect.arrayContaining(['old-city', 'new-city']))
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })
})
