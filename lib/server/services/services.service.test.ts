import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tagsFor } from '@/lib/shared'
import { uniqueSlug } from '@/lib/server/common/slugs'
import { ApiException } from '@/lib/server/http/errors'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { servicesService } from './services.service'

const fake = vi.hoisted(() => ({
  service: {} as Record<string, ReturnType<typeof vi.fn>>,
  media: { findUnique: vi.fn() },
  $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
}))

vi.mock('@/lib/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/shared')>()
  return { ...actual, tagsFor: vi.fn(actual.tagsFor) }
})
vi.mock('@/lib/server/common/slugs', () => ({ uniqueSlug: vi.fn().mockResolvedValue('new-service') }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({ prisma: fake }))

const row = (over: Record<string, unknown> = {}) => ({ id: 'id-1', slug: 'old-service', title: 'Old', image: null, ...over })
const tagSlugs = () => vi.mocked(tagsFor).mock.calls.filter(([entity]) => entity === 'service').map(([, slug]) => slug)

// Replaces the fake service delegate and media lookup for one test.
function arrange(service: Record<string, unknown>, media: unknown = { id: 'm1', kind: 'IMAGE' }) {
  fake.service = service as typeof fake.service
  fake.media.findUnique.mockResolvedValue(media)
}

describe('servicesService', () => {
  beforeEach(() => {
    vi.mocked(tagsFor).mockClear()
    vi.mocked(uniqueSlug).mockClear()
    vi.mocked(revalidateSite).mockClear()
  })

  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = row()
    arrange({ findUnique: vi.fn().mockResolvedValue(existing), update: vi.fn().mockResolvedValue({ ...existing, slug: 'new-service', title: 'New' }) })

    await servicesService.update('id-1', { title: 'New' })

    expect(tagSlugs()).toEqual(expect.arrayContaining(['old-service', 'new-service']))
    expect(uniqueSlug).toHaveBeenCalledWith(prisma, 'service', 'New', 'id-1')
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('keeps the slug when the title is unchanged and only sends supplied fields', async () => {
    const existing = row()
    const update = vi.fn().mockResolvedValue(existing)
    arrange({ findUnique: vi.fn().mockResolvedValue(existing), update })

    await servicesService.update('id-1', { title: 'Old', summary: 'Hello' })

    expect(uniqueSlug).not.toHaveBeenCalled()
    expect(update.mock.calls[0]?.[0].data).toEqual({ title: 'Old', summary: 'Hello', slug: 'old-service' })
  })

  it('derives a slug from an explicit slug even when the title is unchanged', async () => {
    const existing = row()
    arrange({ findUnique: vi.fn().mockResolvedValue(existing), update: vi.fn().mockResolvedValue({ ...existing, slug: 'new-service' }) })

    await servicesService.update('id-1', { slug: 'Brand New' })

    expect(uniqueSlug).toHaveBeenCalledWith(prisma, 'service', 'Brand New', 'id-1')
  })

  it('rejects a video image with INVALID_MEDIA_KIND and never writes', async () => {
    const create = vi.fn()
    arrange({ aggregate: vi.fn(), create }, { id: 'm1', kind: 'VIDEO' })

    await expect(servicesService.create({ title: 'X', imageId: 'm1' } as never)).rejects.toMatchObject({
      code: 'INVALID_MEDIA_KIND',
      message: 'Service image must be an image',
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects an unknown image on update', async () => {
    arrange({ findUnique: vi.fn().mockResolvedValue(row()), update: vi.fn() }, null)

    const failure = await servicesService.update('id-1', { imageId: 'missing' }).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiException)
    expect(failure).toMatchObject({ status: 400, code: 'UNKNOWN_MEDIA' })
  })

  it('create appends after the highest sortOrder and revalidates the new slug', async () => {
    const create = vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'n', image: null }))
    arrange({ aggregate: vi.fn().mockResolvedValue({ _max: { sortOrder: 4 } }), create })

    await servicesService.create({ title: 'New', isPublished: true } as never)

    expect(create.mock.calls[0]?.[0].data).toMatchObject({ slug: 'new-service', sortOrder: 5, isPublished: true })
    expect(tagSlugs()).toEqual(['new-service'])
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('create starts at sortOrder 0 when there are no services', async () => {
    const create = vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'n', image: null }))
    arrange({ aggregate: vi.fn().mockResolvedValue({ _max: { sortOrder: null } }), create })

    await servicesService.create({ title: 'New', isPublished: false } as never)

    expect(create.mock.calls[0]?.[0].data.sortOrder).toBe(0)
  })

  it('publish toggles only isPublished and revalidates the slug', async () => {
    const existing = row()
    const update = vi.fn().mockResolvedValue({ ...existing, isPublished: true })
    arrange({ findUnique: vi.fn().mockResolvedValue(existing), update })

    await servicesService.publish('id-1', true)

    expect(update.mock.calls[0]?.[0].data).toEqual({ isPublished: true })
    expect(tagSlugs()).toEqual(['old-service'])
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('reorder writes each index as sortOrder and revalidates every service', async () => {
    const update = vi.fn().mockResolvedValue({})
    const findMany = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'a', slug: 'sa' }, { id: 'b', slug: 'sb' }])
      .mockResolvedValueOnce([])
    arrange({ findMany, count: vi.fn().mockResolvedValue(0), update })

    await servicesService.reorder(['b', 'a'])

    expect(update.mock.calls.map(([arg]) => [arg.where.id, arg.data.sortOrder])).toEqual([['b', 0], ['a', 1]])
    expect(tagSlugs()).toEqual(expect.arrayContaining(['sa', 'sb']))
    expect(revalidateSite).toHaveBeenCalledTimes(1)
  })

  it('reorder with a missing id is INVALID_ORDER', async () => {
    arrange({ findMany: vi.fn().mockResolvedValue([{ id: 'a', slug: 'sa' }, { id: 'b', slug: 'sb' }]) })

    await expect(servicesService.reorder(['a'])).rejects.toMatchObject({ code: 'INVALID_ORDER' })
  })

  it('remove deletes and revalidates; unknown id is 404', async () => {
    const del = vi.fn().mockResolvedValue({})
    arrange({ findUnique: vi.fn().mockResolvedValueOnce(row()).mockResolvedValueOnce(null), delete: del })

    await expect(servicesService.remove('id-1')).resolves.toEqual({ id: 'id-1' })
    expect(tagSlugs()).toEqual(['old-service'])
    expect(revalidateSite).toHaveBeenCalledTimes(1)
    await expect(servicesService.remove('gone')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('list filters by q on title and summary with pagination meta', async () => {
    const findMany = vi.fn().mockResolvedValue([])
    arrange({ findMany, count: vi.fn().mockResolvedValue(0) })

    const res = await servicesService.list({ q: 'rent', page: 2, limit: 10 })

    const where = findMany.mock.calls[0]?.[0].where
    expect(JSON.stringify(where)).toContain('"title":{"contains":"rent"')
    expect(JSON.stringify(where)).toContain('"summary":{"contains":"rent"')
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 10, take: 10 })
    expect(res.meta).toMatchObject({ page: 2, limit: 10, total: 0 })
  })
})
