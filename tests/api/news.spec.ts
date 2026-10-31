import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('news', () => {
  let cookie: string
  const api = authedClient(() => cookie)

  const postedTags = () => vi.mocked(revalidateSite).mock.calls.flatMap(([tags]) => tags)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/api/news', { title: 'Opening night', publishedAt: '2026-05-01', ...over })
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

  it('creates with slug, monthLabel and revalidation', async () => {
    const res = await api.post('/api/news', { title: 'Opening night', excerpt: 'x', publishedAt: '2026-05-01' })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ slug: 'opening-night', monthLabel: 'May 2026', isPublished: false, image: null, exhibition: null })
    expect(postedTags()).toContain('news')
  })

  it('news with Tamil title round-trips unchanged', async () => {
    const title = 'கலை கண்காட்சி தொடக்கம்'
    const a = await create({ title })
    const b = await create({ title })
    expect(a.slug).toBe('news')
    expect(b.slug).toBe('news-2')
    const got = await api.get(`/api/news/${a.id}`)
    expect(got.status).toBe(200)
    expect(got.body.data.title).toBe(title)
    expect((await prisma.news.findUniqueOrThrow({ where: { id: a.id } })).title).toBe(title)
  })

  it('news exhibitionId must exist (400 fields.exhibitionId)', async () => {
    const res = await api.post('/api/news', { title: 'T', publishedAt: '2026-05-01', exhibitionId: UNKNOWN_UUID })
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION', fields: { exhibitionId: 'Exhibition not found' } } })
    expect(await prisma.news.count()).toBe(0)
  })

  it('links an existing exhibition and returns it', async () => {
    const ex = await prisma.exhibition.create({
      data: { slug: 'tidewater', title: 'Tidewater', city: 'Mumbai', country: 'India', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-15') },
    })
    const res = await api.post('/api/news', { title: 'T', publishedAt: '2026-05-01', exhibitionId: ex.id })
    expect(res.status).toBe(201)
    expect(res.body.data.exhibition).toEqual({ id: ex.id, title: 'Tidewater', slug: 'tidewater' })
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/api/news', { title: 'T', publishedAt: '2026-05-01', imageId: UNKNOWN_UUID })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
  })

  it('lists newest first with q and published filters and meta', async () => {
    const old = await create({ title: 'Old show', publishedAt: '2025-01-01' })
    await create({ title: 'New show', publishedAt: '2026-06-01', excerpt: 'fresh paint' })
    expect((await api.patch(`/api/news/${old.id}/publish`, { isPublished: true })).status).toBe(200)
    const all = await api.get('/api/news')
    expect(all.status).toBe(200)
    expect(all.body.data.map((n: { title: string }) => n.title)).toEqual(['New show', 'Old show'])
    expect(all.body.meta).toMatchObject({ page: 1, total: 2 })
    const q = await api.get('/api/news?q=PAINT')
    expect(q.body.data.map((n: { title: string }) => n.title)).toEqual(['New show'])
    const pub = await api.get('/api/news?published=true')
    expect(pub.body.data.map((n: { title: string }) => n.title)).toEqual(['Old show'])
    expect((await api.get('/api/news?published=maybe')).status).toBe(400)
  })

  it('PATCH never touches isPublished; slug follows title and old+new tags revalidate', async () => {
    const n = await create()
    expect((await api.patch(`/api/news/${n.id}/publish`, { isPublished: true })).status).toBe(200)
    vi.mocked(revalidateSite).mockClear()
    const res = await api.patch(`/api/news/${n.id}`, { title: 'Closing night', publishedAt: '2026-05-01', isPublished: false })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ slug: 'closing-night', isPublished: true })
    expect(postedTags()).toEqual(expect.arrayContaining(['news']))
  })

  it('delete removes the row; unknown id is 404', async () => {
    const n = await create()
    const removed = await api.del(`/api/news/${n.id}`)
    expect(removed.status).toBe(200)
    expect(removed.body.data).toEqual({ id: n.id })
    expect(await prisma.news.count()).toBe(0)
    expect((await api.get(`/api/news/${UNKNOWN_UUID}`)).status).toBe(404)
  })

  it('news linked to an exhibition also revalidates that exhibition (old and new)', async () => {
    const mk = (slug: string) =>
      prisma.exhibition.create({
        data: { slug, title: slug, city: 'X', country: 'Y', type: 'SOLO', startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01') },
      })
    const first = await mk('first-show')
    const second = await mk('second-show')
    vi.mocked(revalidateSite).mockClear()
    const n = await create({ exhibitionId: first.id })
    expect(postedTags()).toContain('exhibition:first-show')
    vi.mocked(revalidateSite).mockClear()
    expect((await api.patch(`/api/news/${n.id}`, { title: 'Opening night', publishedAt: '2026-05-01', exhibitionId: second.id })).status).toBe(200)
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:first-show', 'exhibition:second-show']))
    vi.mocked(revalidateSite).mockClear()
    expect((await api.patch(`/api/news/${n.id}/publish`, { isPublished: true })).status).toBe(200)
    expect(postedTags()).toContain('exhibition:second-show')
    vi.mocked(revalidateSite).mockClear()
    expect((await api.del(`/api/news/${n.id}`)).status).toBe(200)
    expect(postedTags()).toContain('exhibition:second-show')
  })
})
