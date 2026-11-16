import { describe, expect, it, vi } from 'vitest'
import { tagsFor } from '@/lib/shared'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { FAIR_GALLERY_MAX_IMAGES } from '@/lib/shared'
import { fairsService } from './fairs.service'

vi.mock('@/lib/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared')>()
  return { ...actual, tagsFor: vi.fn(actual.tagsFor) }
})
vi.mock('@/lib/server/common/slugs', () => ({ uniqueSlug: vi.fn().mockResolvedValue('new-fair') }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({
  prisma: { fair: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), aggregate: vi.fn() }, media: { findMany: vi.fn(), findUnique: vi.fn() } },
}))

describe('fairsService rename revalidation', () => {
  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, gallery: [], venue: '', city: '', dateLabel: '' }
    const updated = { ...existing, slug: 'new-fair', title: 'New' }
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(updated as never)

    await fairsService.update('id-1', { title: 'New', imageId: null } as never)

    const slugs = vi.mocked(tagsFor).mock.calls.filter(([entity]) => entity === 'fair').map(([, slug]) => slug)
    expect(slugs).toEqual(expect.arrayContaining(['old-fair', 'new-fair']))
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('keeps the slug when the title is unchanged', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, gallery: [], venue: '', city: '', dateLabel: '' }
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(existing as never)
    vi.mocked(uniqueSlug).mockClear()

    await fairsService.update('id-1', { title: 'Old', imageId: null } as never)

    expect(uniqueSlug).not.toHaveBeenCalled()
    expect(vi.mocked(prisma.fair.update).mock.lastCall?.[0].data).toMatchObject({ slug: 'old-fair' })
  })

  it('keeps the slug when an explicit slug normalises to the current one', async () => {
    const existing = { id: 'id-1', slug: 'old-fair', title: 'Old', image: null, gallery: [], venue: '', city: '', dateLabel: '' }
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(existing as never)
    vi.mocked(uniqueSlug).mockClear()

    await fairsService.update('id-1', { title: 'Old', slug: 'Old Fair', imageId: null } as never)

    expect(uniqueSlug).not.toHaveBeenCalled()
  })
})

describe('fairsService gallery', () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`)
  const existing = { id: 'id-1', slug: 'fair', title: 'Fair', image: null, gallery: [], venue: '', city: '', dateLabel: '' }
  const images = (list: string[]) => list.map((id) => ({ id, kind: 'IMAGE' }))

  it('replaces the gallery in order inside the fair update', async () => {
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(existing as never)
    vi.mocked(prisma.media.findMany).mockResolvedValue(images(['b', 'a']) as never)

    await fairsService.update('id-1', { title: 'Fair', imageId: null, galleryImageIds: ['b', 'a'] } as never)

    expect(vi.mocked(prisma.fair.update).mock.lastCall?.[0].data).toMatchObject({
      gallery: { deleteMany: {}, create: [{ mediaId: 'b', sortOrder: 0 }, { mediaId: 'a', sortOrder: 1 }] },
    })
  })

  it('leaves the gallery alone when the field is omitted', async () => {
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.fair.update).mockResolvedValue(existing as never)

    await fairsService.update('id-1', { title: 'Fair', imageId: null } as never)

    expect(vi.mocked(prisma.fair.update).mock.lastCall?.[0].data).not.toHaveProperty('gallery')
  })

  it('rejects more than the limit on the server even when the schema was bypassed', async () => {
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    await expect(
      fairsService.update('id-1', { title: 'Fair', imageId: null, galleryImageIds: ids(FAIR_GALLERY_MAX_IMAGES + 1) } as never),
    ).rejects.toMatchObject({ code: 'GALLERY_LIMIT' })
  })

  it('rejects unknown and non-image gallery media', async () => {
    vi.mocked(prisma.fair.findUnique).mockResolvedValue(existing as never)
    vi.mocked(prisma.media.findMany).mockResolvedValue([{ id: 'a', kind: 'IMAGE' }] as never)
    await expect(fairsService.update('id-1', { title: 'Fair', imageId: null, galleryImageIds: ['a', 'zz'] } as never)).rejects.toMatchObject({ code: 'UNKNOWN_MEDIA' })
    vi.mocked(prisma.media.findMany).mockResolvedValue([{ id: 'v', kind: 'VIDEO' }] as never)
    await expect(fairsService.update('id-1', { title: 'Fair', imageId: null, galleryImageIds: ['v'] } as never)).rejects.toMatchObject({ code: 'INVALID_MEDIA_KIND' })
  })

  it('creates with the gallery nested and the limit enforced', async () => {
    vi.mocked(prisma.fair.aggregate).mockResolvedValue({ _max: { sortOrder: null } } as never)
    vi.mocked(prisma.fair.create).mockResolvedValue({ ...existing, slug: 'new-fair' } as never)
    vi.mocked(prisma.media.findMany).mockResolvedValue(images(['a']) as never)

    await fairsService.create({ title: 'Fair', imageId: null, galleryImageIds: ['a'], isPublished: false } as never)

    expect(vi.mocked(prisma.fair.create).mock.lastCall?.[0].data).toMatchObject({ gallery: { create: [{ mediaId: 'a', sortOrder: 0 }] } })
    await expect(
      fairsService.create({ title: 'Fair', imageId: null, galleryImageIds: ids(FAIR_GALLERY_MAX_IMAGES + 1) } as never),
    ).rejects.toMatchObject({ code: 'GALLERY_LIMIT' })
  })
})
