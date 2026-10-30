import type { INestApplication } from '@nestjs/common'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { authedClient } from './helpers/crud'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('locations', () => {
  let app: INestApplication
  let prisma: PrismaService
  let cookie: string
  let fetchMock: jest.Mock
  const realFetch = globalThis.fetch
  let api: ReturnType<typeof authedClient>

  const postedTags = () =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse((init as RequestInit).body as string) as { tags: string[] }).tags)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/locations').send({ city: 'Chennai', address: '1 Main Rd', tel: '+914412345678', ...over }).expect(201)
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

  it('creates with city slug, appended sortOrder and revalidation', async () => {
    const a = await api.post('/locations').send({ city: 'Chennai', tel: '+914412345678' }).expect(201)
    expect(a.body.data).toMatchObject({ slug: 'chennai', sortOrder: 0, image: null })
    const b = await api.post('/locations').send({ city: 'Chennai' }).expect(201)
    expect(b.body.data).toMatchObject({ slug: 'chennai-2', sortOrder: 1 })
    expect(await prisma.location.count()).toBe(2)
    expect(postedTags()).toContain('locations')
  })

  it('locations order persists', async () => {
    const a = await create({ city: 'A' })
    const b = await create({ city: 'B' })
    const c = await create({ city: 'C' })
    fetchMock.mockClear()
    const res = await api.put('/locations/order').send({ ids: [b.id, c.id, a.id] }).expect(200)
    expect(res.body.data.map((l: { id: string }) => l.id)).toEqual([b.id, c.id, a.id])
    expect(postedTags()).toContain('locations')
    const rows = await prisma.location.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.id)).toEqual([b.id, c.id, a.id])
  })

  it('reorder with a missing id is 400 INVALID_ORDER', async () => {
    const a = await create({ city: 'A' })
    await create({ city: 'B' })
    const res = await api.put('/locations/order').send({ ids: [a.id] }).expect(400)
    expect(res.body.error.code).toBe('INVALID_ORDER')
  })

  it.each(['044 1234 5678', '+1234567', '+1234567890123456', 'abc'])('location tel %s is rejected (must match ^\\+\\d{8,15}$)', async (tel) => {
    const res = await api.post('/locations').send({ city: 'X', tel }).expect(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(res.body.error.fields.tel).toEqual(expect.any(String))
    expect(await prisma.location.count()).toBe(0)
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/locations').send({ city: 'X', imageId: UNKNOWN_UUID }).expect(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
  })

  it('PATCH changes city and slug, keeps sortOrder, revalidates old and new', async () => {
    const a = await create({ city: 'Chennai' })
    fetchMock.mockClear()
    const res = await api.patch(`/locations/${a.id}`).send({ city: 'Bengaluru', sortOrder: 7 }).expect(200)
    expect(res.body.data).toMatchObject({ city: 'Bengaluru', slug: 'bengaluru', sortOrder: 0 })
    expect(postedTags()).toEqual(expect.arrayContaining(['locations']))
  })

  it('delete removes the row; unknown id is 404', async () => {
    const a = await create()
    await api.del(`/locations/${a.id}`).expect(200)
    expect(await prisma.location.count()).toBe(0)
    await api.get(`/locations/${UNKNOWN_UUID}`).expect(404)
  })
})
