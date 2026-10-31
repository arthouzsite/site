import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('fairs', () => {
  let cookie: string
  const api = authedClient(() => cookie)

  const postedTags = () => vi.mocked(revalidateSite).mock.calls.flatMap(([tags]) => tags)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/api/fairs', { title: 'India Art Fair 2022', city: 'New Delhi', dateLabel: '2022', ...over })
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

  it('creates with slug, appended sortOrder, computed where and revalidation', async () => {
    const first = await api.post('/api/fairs', { title: 'India Art Fair 2022', city: 'New Delhi', dateLabel: '2022' })
    expect(first.status).toBe(201)
    expect(first.body.data).toMatchObject({ slug: 'india-art-fair-2022', sortOrder: 0, isPublished: false, where: 'New Delhi · 2022', image: null })
    const second = await api.post('/api/fairs', { title: 'India Art Fair 2022', venue: 'NSIC Grounds', city: 'New Delhi', dateLabel: '2023' })
    expect(second.status).toBe(201)
    expect(second.body.data).toMatchObject({ slug: 'india-art-fair-2022-2', sortOrder: 1, where: 'NSIC Grounds, New Delhi · 2023' })
    expect(await prisma.fair.count()).toBe(2)
    expect(postedTags()).toContain('fairs')
  })

  it('requires authentication', async () => {
    expect((await authedClient(() => 'not-a-session').get('/api/fairs')).status).toBe(401)
  })

  it('fairs order persists', async () => {
    const a = await create({ title: 'A' })
    const b = await create({ title: 'B' })
    const c = await create({ title: 'C' })
    vi.mocked(revalidateSite).mockClear()
    const res = await api.put('/api/fairs/order', { ids: [c.id, a.id, b.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.map((f: { id: string }) => f.id)).toEqual([c.id, a.id, b.id])
    expect(postedTags()).toContain('fairs')
    const rows = await prisma.fair.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id])
    const list = await api.get('/api/fairs')
    expect(list.status).toBe(200)
    expect(list.body.data.map((f: { id: string }) => f.id)).toEqual([c.id, a.id, b.id])
  })

  it('reorder with a missing or duplicate id is 400 INVALID_ORDER', async () => {
    const a = await create({ title: 'A' })
    await create({ title: 'B' })
    const res = await api.put('/api/fairs/order', { ids: [a.id, a.id] })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_ORDER' } })
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/api/fairs', { title: 'X', imageId: UNKNOWN_UUID })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
    expect(await prisma.fair.count()).toBe(0)
  })

  it('PATCH never touches isPublished or sortOrder; publish toggles and revalidates', async () => {
    const f = await create()
    expect((await api.patch(`/api/fairs/${f.id}/publish`, { isPublished: true })).status).toBe(200)
    vi.mocked(revalidateSite).mockClear()
    const res = await api.patch(`/api/fairs/${f.id}`, { title: 'Renamed Fair', isPublished: false, sortOrder: 9 })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ title: 'Renamed Fair', slug: 'renamed-fair', isPublished: true, sortOrder: 0 })
    expect(postedTags()).toEqual(expect.arrayContaining(['fairs']))
  })

  it('404 for unknown fair, delete removes the row', async () => {
    const missing = await api.get(`/api/fairs/${UNKNOWN_UUID}`)
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
    const f = await create()
    vi.mocked(revalidateSite).mockClear()
    const removed = await api.del(`/api/fairs/${f.id}`)
    expect(removed.status).toBe(200)
    expect(removed.body.data).toEqual({ id: f.id })
    expect(await prisma.fair.count()).toBe(0)
    expect(postedTags()).toContain('fairs')
  })

  it('gets one fair by id', async () => {
    const f = await create()
    const res = await api.get(`/api/fairs/${f.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: f.id, slug: f.slug })
  })
})
