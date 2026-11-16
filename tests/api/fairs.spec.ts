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

  describe('gallery', () => {
    async function media(n: number) {
      return Promise.all(
        Array.from({ length: n }, (_, i) =>
          prisma.media.create({
            data: { key: `fair-g-${i}-${Math.random()}`, url: `https://x/g${i}.jpg`, thumbUrl: `https://x/g${i}t.jpg`, width: 10, height: 8, mime: 'image/jpeg', bytes: 1, alt: `g${i}` },
          }),
        ),
      )
    }

    it('creates with an ordered gallery, reorders on update, and leaves it alone when omitted', async () => {
      const [a, b, c] = await media(3)
      const created = await api.post('/api/fairs', { title: 'Gallery Fair', galleryImageIds: [a!.id, b!.id, c!.id] })
      expect(created.status).toBe(201)
      expect(created.body.data.gallery.map((g: { id: string }) => g.id)).toEqual([a!.id, b!.id, c!.id])
      const id = created.body.data.id as string
      const reordered = await api.patch(`/api/fairs/${id}`, { title: 'Gallery Fair', galleryImageIds: [c!.id, a!.id] })
      expect(reordered.body.data.gallery.map((g: { id: string }) => g.id)).toEqual([c!.id, a!.id])
      const untouched = await api.patch(`/api/fairs/${id}`, { title: 'Gallery Fair' })
      expect(untouched.body.data.gallery.map((g: { id: string }) => g.id)).toEqual([c!.id, a!.id])
      const cleared = await api.patch(`/api/fairs/${id}`, { title: 'Gallery Fair', galleryImageIds: [] })
      expect(cleared.body.data.gallery).toEqual([])
      expect(await prisma.fairImage.count()).toBe(0)
    })

    it('accepts 15 and rejects 16 with a field error and no write', async () => {
      const list = await media(16)
      const ids = list.map((m) => m.id)
      const ok = await api.post('/api/fairs', { title: 'Full', galleryImageIds: ids.slice(0, 15) })
      expect(ok.status).toBe(201)
      expect(ok.body.data.gallery).toHaveLength(15)
      const tooMany = await api.patch(`/api/fairs/${ok.body.data.id}`, { title: 'Full', galleryImageIds: ids })
      expect(tooMany.status).toBe(400)
      expect(tooMany.body.error.fields).toHaveProperty('galleryImageIds')
      expect(await prisma.fairImage.count()).toBe(15)
    })

    it('rejects unknown media and keeps the previous gallery', async () => {
      const [a] = await media(1)
      const f = await api.post('/api/fairs', { title: 'F', galleryImageIds: [a!.id] })
      const bad = await api.patch(`/api/fairs/${f.body.data.id}`, { title: 'F', galleryImageIds: [UNKNOWN_UUID] })
      expect(bad.status).toBe(400)
      expect(bad.body.error.code).toBe('UNKNOWN_MEDIA')
      expect(await prisma.fairImage.count()).toBe(1)
    })

    it('cascades on fair delete and counts as media usage that blocks media delete', async () => {
      const [a] = await media(1)
      const f = await api.post('/api/fairs', { title: 'Used', galleryImageIds: [a!.id] })
      const detail = await api.get(`/api/media/${a!.id}`)
      expect(detail.body.data.usedBy).toEqual([{ type: 'fairGallery', id: f.body.data.id, title: 'Used' }])
      const blocked = await api.del(`/api/media/${a!.id}`)
      expect(blocked.status).toBe(409)
      expect(blocked.body.error.code).toBe('MEDIA_IN_USE')
      await api.del(`/api/fairs/${f.body.data.id}`)
      expect(await prisma.fairImage.count()).toBe(0)
      expect(await prisma.media.count({ where: { id: a!.id } })).toBe(1)
    })
  })
})
