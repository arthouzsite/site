import type { INestApplication } from '@nestjs/common'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { authedClient } from './helpers/crud'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('news', () => {
  let app: INestApplication
  let prisma: PrismaService
  let cookie: string
  let fetchMock: jest.Mock
  const realFetch = globalThis.fetch
  let api: ReturnType<typeof authedClient>

  const postedTags = () =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse((init as RequestInit).body as string) as { tags: string[] }).tags)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/news').send({ title: 'Opening night', publishedAt: '2026-05-01', ...over }).expect(201)
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

  it('creates with slug, monthLabel and revalidation', async () => {
    const res = await api.post('/news').send({ title: 'Opening night', excerpt: 'x', publishedAt: '2026-05-01' }).expect(201)
    expect(res.body.data).toMatchObject({ slug: 'opening-night', monthLabel: 'May 2026', isPublished: false, image: null, exhibition: null })
    expect(postedTags()).toContain('news')
  })

  it('news with Tamil title round-trips unchanged', async () => {
    const title = 'கலை கண்காட்சி தொடக்கம்'
    const a = await create({ title })
    const b = await create({ title })
    expect(a.slug).toBe('news')
    expect(b.slug).toBe('news-2')
    const got = await api.get(`/news/${a.id}`).expect(200)
    expect(got.body.data.title).toBe(title)
    expect((await prisma.news.findUniqueOrThrow({ where: { id: a.id } })).title).toBe(title)
  })

  it('news exhibitionId must exist (400 fields.exhibitionId)', async () => {
    const res = await api.post('/news').send({ title: 'T', publishedAt: '2026-05-01', exhibitionId: UNKNOWN_UUID }).expect(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'VALIDATION', fields: { exhibitionId: 'Exhibition not found' } } })
    expect(await prisma.news.count()).toBe(0)
  })

  it('links an existing exhibition and returns it', async () => {
    const ex = await prisma.exhibition.create({
      data: { slug: 'tidewater', title: 'Tidewater', city: 'Mumbai', country: 'India', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-15') },
    })
    const res = await api.post('/news').send({ title: 'T', publishedAt: '2026-05-01', exhibitionId: ex.id }).expect(201)
    expect(res.body.data.exhibition).toEqual({ id: ex.id, title: 'Tidewater', slug: 'tidewater' })
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/news').send({ title: 'T', publishedAt: '2026-05-01', imageId: UNKNOWN_UUID }).expect(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
  })

  it('lists newest first with q and published filters and meta', async () => {
    const old = await create({ title: 'Old show', publishedAt: '2025-01-01' })
    await create({ title: 'New show', publishedAt: '2026-06-01', excerpt: 'fresh paint' })
    await api.patch(`/news/${old.id}/publish`).send({ isPublished: true }).expect(200)
    const all = await api.get('/news').expect(200)
    expect(all.body.data.map((n: { title: string }) => n.title)).toEqual(['New show', 'Old show'])
    expect(all.body.meta).toMatchObject({ page: 1, total: 2 })
    const q = await api.get('/news?q=PAINT').expect(200)
    expect(q.body.data.map((n: { title: string }) => n.title)).toEqual(['New show'])
    const pub = await api.get('/news?published=true').expect(200)
    expect(pub.body.data.map((n: { title: string }) => n.title)).toEqual(['Old show'])
    await api.get('/news?published=maybe').expect(400)
  })

  it('PATCH never touches isPublished; slug follows title and old+new tags revalidate', async () => {
    const n = await create()
    await api.patch(`/news/${n.id}/publish`).send({ isPublished: true }).expect(200)
    fetchMock.mockClear()
    const res = await api.patch(`/news/${n.id}`).send({ title: 'Closing night', publishedAt: '2026-05-01', isPublished: false }).expect(200)
    expect(res.body.data).toMatchObject({ slug: 'closing-night', isPublished: true })
    expect(postedTags()).toEqual(expect.arrayContaining(['news']))
  })

  it('delete removes the row; unknown id is 404', async () => {
    const n = await create()
    await api.del(`/news/${n.id}`).expect(200)
    expect(await prisma.news.count()).toBe(0)
    await api.get(`/news/${UNKNOWN_UUID}`).expect(404)
  })

  it('news linked to an exhibition also revalidates that exhibition (old and new)', async () => {
    const mk = (slug: string) =>
      prisma.exhibition.create({
        data: { slug, title: slug, city: 'X', country: 'Y', type: 'SOLO', startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01') },
      })
    const first = await mk('first-show')
    const second = await mk('second-show')
    fetchMock.mockClear()
    const n = await create({ exhibitionId: first.id })
    expect(postedTags()).toContain('exhibition:first-show')
    fetchMock.mockClear()
    await api.patch(`/news/${n.id}`).send({ title: 'Opening night', publishedAt: '2026-05-01', exhibitionId: second.id }).expect(200)
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:first-show', 'exhibition:second-show']))
    fetchMock.mockClear()
    await api.patch(`/news/${n.id}/publish`).send({ isPublished: true }).expect(200)
    expect(postedTags()).toContain('exhibition:second-show')
    fetchMock.mockClear()
    await api.del(`/news/${n.id}`).expect(200)
    expect(postedTags()).toContain('exhibition:second-show')
  })
})
