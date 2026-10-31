import { describe, expect, it, vi } from 'vitest'
import { tagsFor } from '@/lib/shared'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { fairsService } from './fairs.service'

vi.mock('@/lib/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared')>()
  return { ...actual, tagsFor: vi.fn(actual.tagsFor) }
})
vi.mock('@/lib/server/common/slugs', () => ({ uniqueSlug: vi.fn().mockResolvedValue('new-fair') }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({ prisma: { fair: { findUnique: vi.fn(), update: vi.fn() } } }))

describe('fairsService rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, venue: '', city: '', dateLabel: '' }
    const updated = { ...existing, slug: 'new-fair', title: 'New' }
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(updated as never)

    await fairsService.update('id-1', { title: 'New', imageId: null } as never)

    const slugs = vi.mocked(tagsFor).mock.calls.filter(([entity]) => entity === 'fair').map(([, slug]) => slug)
    expect(slugs).toEqual(expect.arrayContaining(['old-fair', 'new-fair']))
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('keeps the slug when the title is unchanged', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, venue: '', city: '', dateLabel: '' }
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(existing as never)
    vi.mocked(uniqueSlug).mockClear()

    await fairsService.update('id-1', { title: 'Old', imageId: null } as never)

    expect(uniqueSlug).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.fair.update).mock.lastCall?.[0].data).toMatchObject({ slug: 'old-fair' })
  })

  it('keeps the slug when an explicit slug normalises to the current one', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, venue: '', city: '', dateLabel: '' }
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(existing as never)
    vi.mocked(uniqueSlug).mockClear()

    await fairsService.update('id-1', { title: 'Old', slug: 'Old Fair', imageId: null } as never)

    expect(uniqueSlug).not.toHaveBeenCalled()
  })
})
