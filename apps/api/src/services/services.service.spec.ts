import { BadRequestException, NotFoundException } from '@nestjs/common'
import { tagsFor } from '@arthouz/shared'
import { uniqueSlug } from '../common/slugs'
import { ServicesService } from './services.service'

jest.mock('@arthouz/shared', () => {
  const actual = jest.requireActual('@arthouz/shared')
  return { ...actual, tagsFor: jest.fn(actual.tagsFor) }
})
jest.mock('../common/slugs', () => ({ uniqueSlug: jest.fn().mockResolvedValue('new-service') }))

const row = (over: Record<string, unknown> = {}) => ({ id: 'id-1', slug: 'old-service', title: 'Old', image: null, ...over })
const tagSlugs = () => (tagsFor as jest.Mock).mock.calls.filter(([e]) => e === 'service').map(([, s]) => s)

function build(prismaService: Record<string, unknown>, media: unknown = { id: 'm1', kind: 'IMAGE' }) {
  const prisma = {
    service: prismaService,
    media: { findUnique: jest.fn().mockResolvedValue(media) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  }
  const revalidate = { trigger: jest.fn() }
  return { service: new ServicesService(prisma as never, revalidate as never), prisma, revalidate }
}

describe('ServicesService', () => {
  beforeEach(() => {
    ;(tagsFor as jest.Mock).mockClear()
    ;(uniqueSlug as jest.Mock).mockClear()
  })

  it('passes both the old and the new slug to tagsFor on title change', async () => {
    const existing = row()
    const { service, revalidate } = build({
      findUnique: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue({ ...existing, slug: 'new-service', title: 'New' }),
    })

    await service.update('id-1', { title: 'New' })

    expect(tagSlugs()).toEqual(expect.arrayContaining(['old-service', 'new-service']))
    expect(uniqueSlug).toHaveBeenCalledWith(expect.anything(), 'service', 'New', 'id-1')
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })

  it('keeps the slug when the title is unchanged and only sends supplied fields', async () => {
    const existing = row()
    const update = jest.fn().mockResolvedValue(existing)
    const { service } = build({ findUnique: jest.fn().mockResolvedValue(existing), update })

    await service.update('id-1', { title: 'Old', summary: 'Hello' })

    expect(uniqueSlug).not.toHaveBeenCalled()
    expect(update.mock.calls[0][0].data).toEqual({ title: 'Old', summary: 'Hello', slug: 'old-service' })
  })

  it('derives a slug from an explicit slug even when the title is unchanged', async () => {
    const existing = row()
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue({ ...existing, slug: 'new-service' }),
    })

    await service.update('id-1', { slug: 'Brand New' })

    expect(uniqueSlug).toHaveBeenCalledWith(expect.anything(), 'service', 'Brand New', 'id-1')
  })

  it('rejects a video image with INVALID_MEDIA_KIND and never writes', async () => {
    const create = jest.fn()
    const { service } = build({ aggregate: jest.fn(), create }, { id: 'm1', kind: 'VIDEO' })

    await expect(service.create({ title: 'X', imageId: 'm1' } as never)).rejects.toMatchObject({
      response: { code: 'INVALID_MEDIA_KIND', message: 'Service image must be an image' },
    })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects an unknown image on update', async () => {
    const { service } = build({ findUnique: jest.fn().mockResolvedValue(row()), update: jest.fn() }, null)

    await expect(service.update('id-1', { imageId: 'missing' })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('create appends after the highest sortOrder and revalidates the new slug', async () => {
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'n', image: null }))
    const { service, revalidate } = build({ aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 4 } }), create })

    await service.create({ title: 'New', isPublished: true } as never)

    expect(create.mock.calls[0][0].data).toMatchObject({ slug: 'new-service', sortOrder: 5, isPublished: true })
    expect(tagSlugs()).toEqual(['new-service'])
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })

  it('create starts at sortOrder 0 when there are no services', async () => {
    const create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'n', image: null }))
    const { service } = build({ aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: null } }), create })

    await service.create({ title: 'New', isPublished: false } as never)

    expect(create.mock.calls[0][0].data.sortOrder).toBe(0)
  })

  it('publish toggles only isPublished and revalidates the slug', async () => {
    const existing = row()
    const update = jest.fn().mockResolvedValue({ ...existing, isPublished: true })
    const { service, revalidate } = build({ findUnique: jest.fn().mockResolvedValue(existing), update })

    await service.publish('id-1', true)

    expect(update.mock.calls[0][0].data).toEqual({ isPublished: true })
    expect(tagSlugs()).toEqual(['old-service'])
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })

  it('reorder writes each index as sortOrder and revalidates every service', async () => {
    const update = jest.fn().mockResolvedValue({})
    const findMany = jest
      .fn()
      .mockResolvedValueOnce([{ id: 'a', slug: 'sa' }, { id: 'b', slug: 'sb' }])
      .mockResolvedValueOnce([])
    const { service, revalidate } = build({ findMany, count: jest.fn().mockResolvedValue(0), update })

    await service.reorder(['b', 'a'])

    expect(update.mock.calls.map(([arg]) => [arg.where.id, arg.data.sortOrder])).toEqual([['b', 0], ['a', 1]])
    expect(tagSlugs()).toEqual(expect.arrayContaining(['sa', 'sb']))
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
  })

  it('reorder with a missing id is INVALID_ORDER', async () => {
    const { service } = build({ findMany: jest.fn().mockResolvedValue([{ id: 'a', slug: 'sa' }, { id: 'b', slug: 'sb' }]) })

    await expect(service.reorder(['a'])).rejects.toMatchObject({ response: { code: 'INVALID_ORDER' } })
  })

  it('remove deletes and revalidates; unknown id is 404', async () => {
    const del = jest.fn().mockResolvedValue({})
    const { service, revalidate } = build({ findUnique: jest.fn().mockResolvedValueOnce(row()).mockResolvedValueOnce(null), delete: del })

    await expect(service.remove('id-1')).resolves.toEqual({ id: 'id-1' })
    expect(tagSlugs()).toEqual(['old-service'])
    expect(revalidate.trigger).toHaveBeenCalledTimes(1)
    await expect(service.remove('gone')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('list filters by q on title and summary with pagination meta', async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)
    const { service } = build({ findMany, count })

    const res = await service.list({ q: 'rent', page: 2, limit: 10 })

    const where = findMany.mock.calls[0][0].where
    expect(JSON.stringify(where)).toContain('"title":{"contains":"rent"')
    expect(JSON.stringify(where)).toContain('"summary":{"contains":"rent"')
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 10 })
    expect(res.meta).toMatchObject({ page: 2, limit: 10, total: 0 })
  })
})
