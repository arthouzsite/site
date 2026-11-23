import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRINT_CATEGORIES_MAX, PRINT_CATEGORY_MAX_IMAGES, publicPrintCategoryListSchema, publicPrintCategorySchema } from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { ok } from './helpers/public'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('prints', () => {
  let cookie: string
  const api = authedClient(() => cookie)
  const postedTags = () => vi.mocked(revalidateSite).mock.calls.flatMap(([tags]) => tags)
  const imageIds = (body: { data: { images: Array<{ id: string }> } }) => body.data.images.map((image) => image.id)

  async function media(n: number) {
    return Promise.all(
      Array.from({ length: n }, (_, i) =>
        prisma.media.create({
          data: { key: `print-${i}-${Math.random()}`, url: `https://x/p${i}.jpg`, thumbUrl: `https://x/p${i}t.jpg`, width: 8, height: 10, mime: 'image/jpeg', bytes: 1, alt: `p${i}` },
        }),
      ),
    )
  }
  async function create(name: string, ids: string[] = []) {
    const res = await api.post('/api/prints', { name, imageIds: ids })
    expect(res.status).toBe(201)
    return res.body.data as { id: string; slug: string }
  }

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
    vi.mocked(revalidateSite).mockClear()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('requires a session for the CMS routes', async () => {
    expect((await authedClient(() => 'not-a-session').get('/api/prints')).status).toBe(401)
    expect((await authedClient(() => 'not-a-session').post('/api/prints', { name: 'Etchings' })).status).toBe(401)
  })

  it('creates categories with a slug, appended order, ordered images and revalidation', async () => {
    const [a, b] = await media(2)
    const first = await api.post('/api/prints', { name: 'Etchings', imageIds: [b!.id, a!.id] })
    expect(first.status).toBe(201)
    expect(first.body.data).toMatchObject({ name: 'Etchings', slug: 'etchings', sortOrder: 0 })
    expect(imageIds(first.body)).toEqual([b!.id, a!.id])
    const second = await api.post('/api/prints', { name: 'Etchings' })
    expect(second.body.data).toMatchObject({ slug: 'etchings-2', sortOrder: 1, images: [] })
    expect(postedTags()).toEqual(expect.arrayContaining(['prints', 'print:etchings']))
    const list = await api.get('/api/prints')
    expect(list.body.data.map((c: { slug: string }) => c.slug)).toEqual(['etchings', 'etchings-2'])
  })

  it('requires a category name', async () => {
    const res = await api.post('/api/prints', { name: '  ' })
    expect(res.status).toBe(400)
    expect(res.body.error.fields).toHaveProperty('name')
    expect(await prisma.printCategory.count()).toBe(0)
  })

  it('renames with a new slug, replaces the images and leaves them alone when omitted', async () => {
    const [a, b, c] = await media(3)
    const category = await create('Lithographs', [a!.id, b!.id])
    vi.mocked(revalidateSite).mockClear()
    const renamed = await api.patch(`/api/prints/${category.id}`, { name: 'Linocuts', imageIds: [c!.id, a!.id] })
    expect(renamed.status).toBe(200)
    expect(renamed.body.data).toMatchObject({ name: 'Linocuts', slug: 'linocuts' })
    expect(imageIds(renamed.body)).toEqual([c!.id, a!.id])
    expect(postedTags()).toEqual(expect.arrayContaining(['print:lithographs', 'print:linocuts']))
    const untouched = await api.patch(`/api/prints/${category.id}`, { name: 'Linocuts' })
    expect(imageIds(untouched.body)).toEqual([c!.id, a!.id])
  })

  it(`accepts ${PRINT_CATEGORY_MAX_IMAGES} images and rejects one more with a field error and no write`, async () => {
    const ids = (await media(PRINT_CATEGORY_MAX_IMAGES + 1)).map((m) => m.id)
    const full = await api.post('/api/prints', { name: 'Full', imageIds: ids.slice(0, PRINT_CATEGORY_MAX_IMAGES) })
    expect(full.status).toBe(201)
    const tooMany = await api.patch(`/api/prints/${full.body.data.id}`, { name: 'Full', imageIds: ids })
    expect(tooMany.status).toBe(400)
    expect(tooMany.body.error.fields).toHaveProperty('imageIds')
    expect(await prisma.printImage.count()).toBe(PRINT_CATEGORY_MAX_IMAGES)
  })

  it('rejects a repeated image and unknown media', async () => {
    const [a] = await media(1)
    const repeated = await api.post('/api/prints', { name: 'Twice', imageIds: [a!.id, a!.id] })
    expect(repeated.status).toBe(400)
    const unknown = await api.post('/api/prints', { name: 'Ghost', imageIds: [UNKNOWN_UUID] })
    expect(unknown.status).toBe(400)
    expect(unknown.body.error.code).toBe('UNKNOWN_MEDIA')
    expect(await prisma.printCategory.count()).toBe(0)
  })

  it(`holds at most ${PRINT_CATEGORIES_MAX} categories`, async () => {
    await prisma.printCategory.createMany({
      data: Array.from({ length: PRINT_CATEGORIES_MAX }, (_, i) => ({ name: `C${i}`, slug: `c${i}`, sortOrder: i })),
    })
    const res = await api.post('/api/prints', { name: 'One too many' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('PRINT_CATEGORY_LIMIT')
    expect(await prisma.printCategory.count()).toBe(PRINT_CATEGORIES_MAX)
  })

  it('persists a new order and rejects a partial one', async () => {
    const a = await create('A')
    const b = await create('B')
    const c = await create('C')
    const res = await api.put('/api/prints/order', { ids: [c.id, a.id, b.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.map((row: { id: string }) => row.id)).toEqual([c.id, a.id, b.id])
    expect((await api.put('/api/prints/order', { ids: [a.id] })).status).toBe(400)
  })

  it('deletes a category with its image links, keeps the media, and counts as media usage', async () => {
    const [a] = await media(1)
    const category = await create('Used', [a!.id])
    const detail = await api.get(`/api/media/${a!.id}`)
    expect(detail.body.data.usedBy).toEqual([{ type: 'print', id: category.id, title: 'Used' }])
    expect((await api.del(`/api/media/${a!.id}`)).status).toBe(409)
    expect((await api.del(`/api/prints/${category.id}`)).status).toBe(200)
    expect(await prisma.printImage.count()).toBe(0)
    expect(await prisma.media.count({ where: { id: a!.id } })).toBe(1)
    expect((await api.del(`/api/prints/${UNKNOWN_UUID}`)).status).toBe(404)
  })

  it('serves the site only categories that hold images, in order, without a session', async () => {
    const [a, b] = await media(2)
    await create('Empty')
    const etchings = await create('Etchings', [b!.id, a!.id])
    const list = await ok('/api/public/prints', publicPrintCategoryListSchema)
    expect(list.map((c) => c.slug)).toEqual(['etchings'])
    expect(list[0]!.images.map((image) => image.alt)).toEqual(['p1', 'p0'])
    const detail = await ok(`/api/public/prints/${etchings.slug}`, publicPrintCategorySchema)
    expect(detail).toMatchObject({ name: 'Etchings', slug: 'etchings' })
    expect((await call('GET', '/api/public/prints/empty')).status).toBe(404)
    expect((await call('GET', '/api/public/prints/nope')).status).toBe(404)
  })
})
