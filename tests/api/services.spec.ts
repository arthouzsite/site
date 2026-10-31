import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('services', () => {
  let cookie: string
  const api = authedClient(() => cookie)

  const postedTags = () => vi.mocked(revalidateSite).mock.calls.flatMap(([tags]) => tags)
  const clearTags = () => vi.mocked(revalidateSite).mockClear()
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/api/services', { title: 'Art sales', ...over })
    expect(res.status).toBe(201)
    return res.body.data as { id: string; slug: string }
  }
  const media = (kind: 'IMAGE' | 'VIDEO', key: string) =>
    prisma.media.create({
      data: { key, url: `https://x/${key}.jpg`, thumbUrl: `https://x/${key}t.jpg`, width: 3, height: 2, mime: kind === 'IMAGE' ? 'image/jpeg' : 'video/mp4', kind, bytes: 1, alt: `alt ${key}` },
    })

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
    clearTags()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('requires authentication on admin routes', async () => {
    expect((await call('GET', '/api/services')).status).toBe(401)
    expect((await call('POST', '/api/services', { body: { title: 'x' } })).status).toBe(401)
  })

  it('creates with defaults, slug, appended sortOrder and revalidation', async () => {
    const first = await api.post('/api/services', { title: 'Art sales' })
    expect(first.status).toBe(201)
    expect(first.body.data).toMatchObject({
      slug: 'art-sales', sortOrder: 0, isPublished: false, image: null, summary: '', body: '',
      ctaLabel: 'Enquire →', ctaHref: '', contactName: '', contactPhone: '', contactEmail: '',
    })
    const second = await api.post('/api/services', { title: 'Art sales', summary: 'Again' })
    expect(second.status).toBe(201)
    expect(second.body.data).toMatchObject({ slug: 'art-sales-2', sortOrder: 1, summary: 'Again' })
    expect(await prisma.service.count()).toBe(2)
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales']))
  })

  it('create honours an explicit slug and isPublished', async () => {
    const res = await api.post('/api/services', { title: 'Art sales', slug: 'sell', isPublished: true })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ slug: 'sell', isPublished: true })
  })

  it('validates input: title, link scheme, phone, email', async () => {
    for (const body of [
      { title: '' },
      { title: 'x', ctaHref: 'javascript:alert(1)' },
      { title: 'x', contactPhone: '044 1234' },
      { title: 'x', contactEmail: 'nope' },
      { title: 'x', summary: 'x'.repeat(401) },
    ]) {
      const res = await api.post('/api/services', body)
      expect(res.status).toBe(400)
      expect(res.body.error.fields).toBeDefined()
    }
    expect(await prisma.service.count()).toBe(0)
    expect((await api.post('/api/services', { title: 'x', ctaHref: 'mailto:a@b.co', contactPhone: '+914412345678', contactEmail: 'a@b.co' })).status).toBe(201)
    expect((await api.post('/api/services', { title: 'y', ctaHref: 'tel:+914412345678' })).status).toBe(201)
  })

  it('stores a valid image and returns it', async () => {
    const image = await media('IMAGE', 'ok')
    const res = await api.post('/api/services', { title: 'With image', imageId: image.id })
    expect(res.status).toBe(201)
    expect(res.body.data.image).toEqual({ id: image.id, url: 'https://x/ok.jpg', thumbUrl: 'https://x/okt.jpg', width: 3, height: 2, alt: 'alt ok' })
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/api/services', { title: 'X', imageId: UNKNOWN_UUID })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
    expect(await prisma.service.count()).toBe(0)
  })

  it('a VIDEO image is 400 INVALID_MEDIA_KIND on create and patch', async () => {
    const video = await media('VIDEO', 'vid')
    const res = await api.post('/api/services', { title: 'X', imageId: video.id })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_MEDIA_KIND')
    const s = await create()
    const patched = await api.patch(`/api/services/${s.id}`, { imageId: video.id })
    expect(patched.status).toBe(400)
    expect(patched.body.error.code).toBe('INVALID_MEDIA_KIND')
    expect((await prisma.service.findUniqueOrThrow({ where: { id: s.id } })).imageId).toBeNull()
  })

  it('PATCH changes only supplied fields, never publish state or order; a rename re-slugs and revalidates both slugs', async () => {
    const s = await create({ summary: 'Keep me', contactName: 'Asha' })
    expect((await api.patch(`/api/services/${s.id}/publish`, { isPublished: true })).status).toBe(200)
    clearTags()
    const res = await api.patch(`/api/services/${s.id}`, { title: 'Renamed service', isPublished: false, sortOrder: 9 })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ title: 'Renamed service', slug: 'renamed-service', isPublished: true, sortOrder: 0, summary: 'Keep me', contactName: 'Asha' })
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales', 'service:renamed-service']))
    const same = await api.patch(`/api/services/${s.id}`, { summary: 'Updated' })
    expect(same.status).toBe(200)
    expect(same.body.data).toMatchObject({ slug: 'renamed-service', summary: 'Updated', title: 'Renamed service' })
  })

  it('PATCH can clear the image and contact fields', async () => {
    const image = await media('IMAGE', 'clr')
    const s = await create({ imageId: image.id, contactEmail: 'a@b.co' })
    const res = await api.patch(`/api/services/${s.id}`, { imageId: null, contactEmail: '' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ image: null, contactEmail: '' })
  })

  it('publish toggles and revalidates; a bad body is 400', async () => {
    const s = await create()
    clearTags()
    const res = await api.patch(`/api/services/${s.id}/publish`, { isPublished: true })
    expect(res.status).toBe(200)
    expect(res.body.data.isPublished).toBe(true)
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales']))
    expect((await api.patch(`/api/services/${s.id}/publish`, {})).status).toBe(400)
    expect((await api.patch(`/api/services/${UNKNOWN_UUID}/publish`, { isPublished: true })).status).toBe(404)
  })

  it('order persists and drives the admin list', async () => {
    const a = await create({ title: 'A' })
    const b = await create({ title: 'B' })
    const c = await create({ title: 'C' })
    clearTags()
    const res = await api.put('/api/services/order', { ids: [c.id, a.id, b.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.map((s: { id: string }) => s.id)).toEqual([c.id, a.id, b.id])
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:a', 'service:b', 'service:c']))
    const rows = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id])
    const list = await api.get('/api/services')
    expect(list.status).toBe(200)
    expect(list.body.data.map((s: { id: string }) => s.id)).toEqual([c.id, a.id, b.id])
  })

  it('reorder with a missing or duplicate id is 400 INVALID_ORDER', async () => {
    const a = await create({ title: 'A' })
    await create({ title: 'B' })
    const res = await api.put('/api/services/order', { ids: [a.id, a.id] })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_ORDER' } })
  })

  it('list filters by q on title and summary, paginates and caps q', async () => {
    await create({ title: 'Gallery on rent', summary: 'Hire the gallery' })
    await create({ title: 'Art for rent', summary: 'Offices and hotels' })
    await create({ title: 'Art sales', summary: 'Acquire works' })
    const byTitle = await api.get('/api/services?q=GALLERY')
    expect(byTitle.status).toBe(200)
    expect(byTitle.body.data.map((s: { title: string }) => s.title)).toEqual(['Gallery on rent'])
    const bySummary = await api.get('/api/services?q=hotels')
    expect(bySummary.body.data.map((s: { title: string }) => s.title)).toEqual(['Art for rent'])
    const paged = await api.get('/api/services?limit=2&page=2')
    expect(paged.status).toBe(200)
    expect(paged.body.data.map((s: { title: string }) => s.title)).toEqual(['Art sales'])
    expect(paged.body.meta).toMatchObject({ page: 2, limit: 2, total: 3 })
    expect((await api.get(`/api/services?q=${'x'.repeat(121)}`)).status).toBe(400)
  })

  it('404 for unknown service, delete removes the row and revalidates', async () => {
    const missing = await api.get(`/api/services/${UNKNOWN_UUID}`)
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
    expect((await api.patch(`/api/services/${UNKNOWN_UUID}`, { title: 'x' })).status).toBe(404)
    const s = await create()
    clearTags()
    const removed = await api.del(`/api/services/${s.id}`)
    expect(removed.status).toBe(200)
    expect(removed.body.data).toEqual({ id: s.id })
    expect(await prisma.service.count()).toBe(0)
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales']))
    expect((await api.del(`/api/services/${s.id}`)).status).toBe(404)
  })

  it('a service image appears in media usage and blocks deleting the media', async () => {
    const image = await media('IMAGE', 'used')
    const s = await create({ title: 'Uses image', imageId: image.id })
    const usage = { type: 'service', id: s.id, title: 'Uses image' }
    const got = await api.get(`/api/media/${image.id}`)
    expect(got.status).toBe(200)
    expect(got.body.data.usedBy).toEqual([usage])
    const res = await api.del(`/api/media/${image.id}`)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('MEDIA_IN_USE')
    expect(res.body.error.details.usedBy).toEqual([usage])
    expect(await prisma.media.count({ where: { id: image.id } })).toBe(1)
  })

  it('gets one service by id', async () => {
    const s = await create()
    const res = await api.get(`/api/services/${s.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: s.id, slug: 'art-sales' })
  })
})
