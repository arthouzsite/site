import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('locations', () => {
  let cookie: string
  const api = authedClient(() => cookie)

  const postedTags = () => vi.mocked(revalidateSite).mock.calls.flatMap(([tags]) => tags)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/api/locations', { city: 'Chennai', address: '1 Main Rd', tel: '+914412345678', ...over })
    expect(res.status).toBe(201)
    return res.body.data as { id: string; slug: string }
  }

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    vi.mocked(revalidateSite).mockClear()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creates with city slug, appended sortOrder and revalidation', async () => {
    const a = await api.post('/api/locations', { city: 'Chennai', tel: '+914412345678' })
    expect(a.status).toBe(201)
    expect(a.body.data).toMatchObject({ slug: 'chennai', sortOrder: 0, image: null })
    const b = await api.post('/api/locations', { city: 'Chennai' })
    expect(b.status).toBe(201)
    expect(b.body.data).toMatchObject({ slug: 'chennai-2', sortOrder: 1 })
    expect(await prisma.location.count()).toBe(2)
    expect(postedTags()).toContain('locations')
  })

  it('lists locations in sort order with pagination meta', async () => {
    await create({ city: 'A' })
    await create({ city: 'B' })
    const res = await api.get('/api/locations')
    expect(res.status).toBe(200)
    expect(res.body.data.map((l: { city: string }) => l.city)).toEqual(['A', 'B'])
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 2 })
  })

  it('gets one location by id', async () => {
    const a = await create({ city: 'A' })
    const res = await api.get(`/api/locations/${a.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: a.id, city: 'A' })
  })

  it('locations order persists', async () => {
    const a = await create({ city: 'A' })
    const b = await create({ city: 'B' })
    const c = await create({ city: 'C' })
    vi.mocked(revalidateSite).mockClear()
    const res = await api.put('/api/locations/order', { ids: [b.id, c.id, a.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.map((l: { id: string }) => l.id)).toEqual([b.id, c.id, a.id])
    expect(postedTags()).toContain('locations')
    const rows = await prisma.location.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.id)).toEqual([b.id, c.id, a.id])
  })

  it('reorder with a missing id is 400 INVALID_ORDER', async () => {
    const a = await create({ city: 'A' })
    await create({ city: 'B' })
    const res = await api.put('/api/locations/order', { ids: [a.id] })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_ORDER')
  })

  it.each(['044 1234 5678', '+1234567', '+1234567890123456', 'abc'])('location tel %s is rejected (must match ^\\+\\d{8,15}$)', async (tel) => {
    const res = await api.post('/api/locations', { city: 'X', tel })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
    expect(res.body.error.fields.tel).toEqual(expect.any(String))
    expect(await prisma.location.count()).toBe(0)
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/api/locations', { city: 'X', imageId: UNKNOWN_UUID })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
  })

  it('PATCH changes city and slug, keeps sortOrder, revalidates old and new', async () => {
    const a = await create({ city: 'Chennai' })
    vi.mocked(revalidateSite).mockClear()
    const res = await api.patch(`/api/locations/${a.id}`, { city: 'Bengaluru', sortOrder: 7 })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ city: 'Bengaluru', slug: 'bengaluru', sortOrder: 0 })
    expect(postedTags()).toEqual(expect.arrayContaining(['locations']))
  })

  it('delete removes the row; unknown id is 404', async () => {
    const a = await create()
    const del = await api.del(`/api/locations/${a.id}`)
    expect(del.status).toBe(200)
    expect(del.body.data).toEqual({ id: a.id })
    expect(await prisma.location.count()).toBe(0)
    expect((await api.get(`/api/locations/${UNKNOWN_UUID}`)).status).toBe(404)
  })

  it('requires a signed-in user', async () => {
    const res = await authedClient(() => 'not-a-session').get('/api/locations')
    expect(res.status).toBe(401)
  })
})
