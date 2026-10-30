import type { INestApplication } from '@nestjs/common'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { authedClient } from './helpers/crud'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('fairs', () => {
  let app: INestApplication
  let prisma: PrismaService
  let cookie: string
  let fetchMock: jest.Mock
  const realFetch = globalThis.fetch
  let api: ReturnType<typeof authedClient>

  const postedTags = () =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse((init as RequestInit).body as string) as { tags: string[] }).tags)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/fairs').send({ title: 'India Art Fair 2022', city: 'New Delhi', dateLabel: '2022', ...over }).expect(201)
    return res.body.data as { id: string; slug: string }
  }

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
    prisma = app.get(PrismaService)
    api = authedClient(app, () => cookie)
  })
  beforeEach(async () => {
    await resetDb()
    resetThrottle(app)
    await seedUser(app, { email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs(app, 'admin@example.test')
    fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = ((url: string, init?: RequestInit) =>
      String(url).includes('/api/revalidate') ? fetchMock(url, init) : realFetch(url, init)) as typeof fetch
  })
  afterEach(() => {
    globalThis.fetch = realFetch
  })
  afterAll(async () => {
    await app.close()
  })

  it('creates with slug, appended sortOrder, computed where and revalidation', async () => {
    const first = await api.post('/fairs').send({ title: 'India Art Fair 2022', city: 'New Delhi', dateLabel: '2022' }).expect(201)
    expect(first.body.data).toMatchObject({ slug: 'india-art-fair-2022', sortOrder: 0, isPublished: false, where: 'New Delhi · 2022', image: null })
    const second = await api.post('/fairs').send({ title: 'India Art Fair 2022', venue: 'NSIC Grounds', city: 'New Delhi', dateLabel: '2023' }).expect(201)
    expect(second.body.data).toMatchObject({ slug: 'india-art-fair-2022-2', sortOrder: 1, where: 'NSIC Grounds, New Delhi · 2023' })
    expect(await prisma.fair.count()).toBe(2)
    expect(postedTags()).toContain('fairs')
  })

  it('fairs order persists', async () => {
    const a = await create({ title: 'A' })
    const b = await create({ title: 'B' })
    const c = await create({ title: 'C' })
    fetchMock.mockClear()
    const res = await api.put('/fairs/order').send({ ids: [c.id, a.id, b.id] }).expect(200)
    expect(res.body.data.map((f: { id: string }) => f.id)).toEqual([c.id, a.id, b.id])
    expect(postedTags()).toContain('fairs')
    const rows = await prisma.fair.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id])
    const list = await api.get('/fairs').expect(200)
    expect(list.body.data.map((f: { id: string }) => f.id)).toEqual([c.id, a.id, b.id])
  })

  it('reorder with a missing or duplicate id is 400 INVALID_ORDER', async () => {
    const a = await create({ title: 'A' })
    await create({ title: 'B' })
    const res = await api.put('/fairs/order').send({ ids: [a.id, a.id] }).expect(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_ORDER' } })
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/fairs').send({ title: 'X', imageId: UNKNOWN_UUID }).expect(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
    expect(await prisma.fair.count()).toBe(0)
  })

  it('PATCH never touches isPublished or sortOrder; publish toggles and revalidates', async () => {
    const f = await create()
    await api.patch(`/fairs/${f.id}/publish`).send({ isPublished: true }).expect(200)
    fetchMock.mockClear()
    const res = await api.patch(`/fairs/${f.id}`).send({ title: 'Renamed Fair', isPublished: false, sortOrder: 9 }).expect(200)
    expect(res.body.data).toMatchObject({ title: 'Renamed Fair', slug: 'renamed-fair', isPublished: true, sortOrder: 0 })
    expect(postedTags()).toEqual(expect.arrayContaining(['fairs']))
  })

  it('404 for unknown fair, delete removes the row', async () => {
    const missing = await api.get(`/fairs/${UNKNOWN_UUID}`).expect(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
    const f = await create()
    await api.del(`/fairs/${f.id}`).expect(200)
    expect(await prisma.fair.count()).toBe(0)
    expect(postedTags()).toContain('fairs')
  })
})
