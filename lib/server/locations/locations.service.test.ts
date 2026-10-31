import { describe, expect, it, vi } from 'vitest'
import { tagsFor } from '@/lib/shared'
import { revalidateSite } from '@/lib/server/revalidate'
import { prisma } from '@/lib/server/prisma'
import { update } from './locations.service'

vi.mock('@/lib/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared')>()
  return { ...actual, tagsFor: vi.fn(actual.tagsFor) }
})
vi.mock('@/lib/server/common/slugs', () => ({ uniqueSlug: vi.fn().mockResolvedValue('new-city') }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({ prisma: { location: { findUnique: vi.fn(), update: vi.fn() } } }))

describe('locations service rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on city change', async () => {
    const existing = { id: 'id-1', slug: 'old-city', city: 'Old', image: null }
    const updated = { ...existing, slug: 'new-city', city: 'New' }
    vi.mocked(prisma.location.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.location.update).mockResolvedValue(updated as never)

    await update('id-1', { city: 'New', imageId: null } as never)

    const slugs = vi.mocked(tagsFor).mock.calls.filter(([entity]) => entity === 'location').map(([, slug]) => slug)
    expect(slugs).toEqual(expect.arrayContaining(['old-city', 'new-city']))
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })
})
