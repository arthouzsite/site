import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { publicSearchSchema, publicServiceListSchema, publicServiceSchema } from '@arthouz/shared'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { authedClient } from './helpers/crud'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const UNKNOWN_UUID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

describe('services', () => {
  let app: INestApplication
  let prisma: PrismaService
  let cookie: string
  let fetchMock: jest.Mock
  const realFetch = globalThis.fetch
  let api: ReturnType<typeof authedClient>

  const postedTags = () =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse((init as RequestInit).body as string) as { tags: string[] }).tags)
  const publicGet = (path: string) => request(app.getHttpServer()).get(path)
  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/services').send({ title: 'Art sales', ...over }).expect(201)
    return res.body.data as { id: string; slug: string }
  }
  const media = (kind: 'IMAGE' | 'VIDEO', key: string) =>
    prisma.media.create({
      data: { key, url: `https://x/${key}.jpg`, thumbUrl: `https://x/${key}t.jpg`, width: 3, height: 2, mime: kind === 'IMAGE' ? 'image/jpeg' : 'video/mp4', kind, bytes: 1, alt: `alt ${key}` },
    })

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

  it('requires authentication on admin routes', async () => {
    await request(app.getHttpServer()).get('/services').expect(401)
    await request(app.getHttpServer()).post('/services').send({ title: 'x' }).expect(401)
  })

  it('creates with defaults, slug, appended sortOrder and revalidation', async () => {
    const first = await api.post('/services').send({ title: 'Art sales' }).expect(201)
    expect(first.body.data).toMatchObject({
      slug: 'art-sales', sortOrder: 0, isPublished: false, image: null, summary: '', body: '',
      ctaLabel: 'Enquire →', ctaHref: '', contactName: '', contactPhone: '', contactEmail: '',
    })
    const second = await api.post('/services').send({ title: 'Art sales', summary: 'Again' }).expect(201)
    expect(second.body.data).toMatchObject({ slug: 'art-sales-2', sortOrder: 1, summary: 'Again' })
    expect(await prisma.service.count()).toBe(2)
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales']))
  })

  it('create honours an explicit slug and isPublished', async () => {
    const res = await api.post('/services').send({ title: 'Art sales', slug: 'sell', isPublished: true }).expect(201)
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
      const res = await api.post('/services').send(body).expect(400)
      expect(res.body.error.fields).toBeDefined()
    }
    expect(await prisma.service.count()).toBe(0)
    await api.post('/services').send({ title: 'x', ctaHref: 'mailto:a@b.co', contactPhone: '+914412345678', contactEmail: 'a@b.co' }).expect(201)
    await api.post('/services').send({ title: 'y', ctaHref: 'tel:+914412345678' }).expect(201)
  })

  it('stores a valid image and returns it', async () => {
    const image = await media('IMAGE', 'ok')
    const res = await api.post('/services').send({ title: 'With image', imageId: image.id }).expect(201)
    expect(res.body.data.image).toEqual({ id: image.id, url: 'https://x/ok.jpg', thumbUrl: 'https://x/okt.jpg', width: 3, height: 2, alt: 'alt ok' })
  })

  it('unknown imageId is 400 UNKNOWN_MEDIA', async () => {
    const res = await api.post('/services').send({ title: 'X', imageId: UNKNOWN_UUID }).expect(400)
    expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
    expect(await prisma.service.count()).toBe(0)
  })

  it('a VIDEO image is 400 INVALID_MEDIA_KIND on create and patch', async () => {
    const video = await media('VIDEO', 'vid')
    const res = await api.post('/services').send({ title: 'X', imageId: video.id }).expect(400)
    expect(res.body.error.code).toBe('INVALID_MEDIA_KIND')
    const s = await create()
    const patched = await api.patch(`/services/${s.id}`).send({ imageId: video.id }).expect(400)
    expect(patched.body.error.code).toBe('INVALID_MEDIA_KIND')
    expect((await prisma.service.findUniqueOrThrow({ where: { id: s.id } })).imageId).toBeNull()
  })

  it('PATCH changes only supplied fields, never publish state or order; a rename re-slugs and revalidates both slugs', async () => {
    const s = await create({ summary: 'Keep me', contactName: 'Asha' })
    await api.patch(`/services/${s.id}/publish`).send({ isPublished: true }).expect(200)
    fetchMock.mockClear()
    const res = await api.patch(`/services/${s.id}`).send({ title: 'Renamed service', isPublished: false, sortOrder: 9 }).expect(200)
    expect(res.body.data).toMatchObject({ title: 'Renamed service', slug: 'renamed-service', isPublished: true, sortOrder: 0, summary: 'Keep me', contactName: 'Asha' })
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales', 'service:renamed-service']))
    const same = await api.patch(`/services/${s.id}`).send({ summary: 'Updated' }).expect(200)
    expect(same.body.data).toMatchObject({ slug: 'renamed-service', summary: 'Updated', title: 'Renamed service' })
  })

  it('PATCH can clear the image and contact fields', async () => {
    const image = await media('IMAGE', 'clr')
    const s = await create({ imageId: image.id, contactEmail: 'a@b.co' })
    const res = await api.patch(`/services/${s.id}`).send({ imageId: null, contactEmail: '' }).expect(200)
    expect(res.body.data).toMatchObject({ image: null, contactEmail: '' })
  })

  it('publish toggles and revalidates; a bad body is 400', async () => {
    const s = await create()
    fetchMock.mockClear()
    const res = await api.patch(`/services/${s.id}/publish`).send({ isPublished: true }).expect(200)
    expect(res.body.data.isPublished).toBe(true)
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales']))
    await api.patch(`/services/${s.id}/publish`).send({}).expect(400)
    await api.patch(`/services/${UNKNOWN_UUID}/publish`).send({ isPublished: true }).expect(404)
  })

  it('order persists and drives the admin list', async () => {
    const a = await create({ title: 'A' })
    const b = await create({ title: 'B' })
    const c = await create({ title: 'C' })
    fetchMock.mockClear()
    const res = await api.put('/services/order').send({ ids: [c.id, a.id, b.id] }).expect(200)
    expect(res.body.data.map((s: { id: string }) => s.id)).toEqual([c.id, a.id, b.id])
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:a', 'service:b', 'service:c']))
    const rows = await prisma.service.findMany({ orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id])
    const list = await api.get('/services').expect(200)
    expect(list.body.data.map((s: { id: string }) => s.id)).toEqual([c.id, a.id, b.id])
  })

  it('reorder with a missing or duplicate id is 400 INVALID_ORDER', async () => {
    const a = await create({ title: 'A' })
    await create({ title: 'B' })
    const res = await api.put('/services/order').send({ ids: [a.id, a.id] }).expect(400)
    expect(res.body).toMatchObject({ ok: false, error: { code: 'INVALID_ORDER' } })
  })

  it('list filters by q on title and summary, paginates and caps q', async () => {
    await create({ title: 'Gallery on rent', summary: 'Hire the gallery' })
    await create({ title: 'Art for rent', summary: 'Offices and hotels' })
    await create({ title: 'Art sales', summary: 'Acquire works' })
    const byTitle = await api.get('/services?q=GALLERY').expect(200)
    expect(byTitle.body.data.map((s: { title: string }) => s.title)).toEqual(['Gallery on rent'])
    const bySummary = await api.get('/services?q=hotels').expect(200)
    expect(bySummary.body.data.map((s: { title: string }) => s.title)).toEqual(['Art for rent'])
    const paged = await api.get('/services?limit=2&page=2').expect(200)
    expect(paged.body.data.map((s: { title: string }) => s.title)).toEqual(['Art sales'])
    expect(paged.body.meta).toMatchObject({ page: 2, limit: 2, total: 3 })
    await api.get(`/services?q=${'x'.repeat(121)}`).expect(400)
  })

  it('404 for unknown service, delete removes the row and revalidates', async () => {
    const missing = await api.get(`/services/${UNKNOWN_UUID}`).expect(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
    await api.patch(`/services/${UNKNOWN_UUID}`).send({ title: 'x' }).expect(404)
    const s = await create()
    fetchMock.mockClear()
    await api.del(`/services/${s.id}`).expect(200)
    expect(await prisma.service.count()).toBe(0)
    expect(postedTags()).toEqual(expect.arrayContaining(['services', 'service:art-sales']))
    await api.del(`/services/${s.id}`).expect(404)
  })

  it('a service image appears in media usage and blocks deleting the media', async () => {
    const image = await media('IMAGE', 'used')
    const s = await create({ title: 'Uses image', imageId: image.id })
    const res = await api.del(`/media/${image.id}`)
    expect(res.status).toBe(409)
    expect(JSON.stringify(res.body)).toContain(JSON.stringify({ type: 'service', id: s.id, title: 'Uses image' }))
  })

  describe('public', () => {
    it('lists only published services in sortOrder with the public shape', async () => {
      const image = await media('IMAGE', 'pub')
      const a = await create({ title: 'A', summary: 'sa', imageId: image.id, contactName: 'Asha', contactPhone: '+914412345678', contactEmail: 'a@b.co', ctaHref: 'tel:+914412345678' })
      const b = await create({ title: 'B' })
      const c = await create({ title: 'C' })
      await create({ title: 'Draft' })
      for (const s of [a, b, c]) await api.patch(`/services/${s.id}/publish`).send({ isPublished: true }).expect(200)
      await api.put('/services/order').send({ ids: [c.id, a.id, b.id, (await prisma.service.findFirstOrThrow({ where: { slug: 'draft' } })).id] }).expect(200)
      const res = await publicGet('/public/services').expect(200)
      const list = publicServiceListSchema.parse(res.body.data)
      expect(list.map((s) => s.slug)).toEqual(['c', 'a', 'b'])
      expect(list[1]).toEqual({
        slug: 'a', title: 'A', summary: 'sa', body: '', image: { url: 'https://x/pub.jpg', thumbUrl: 'https://x/pubt.jpg', width: 3, height: 2, alt: 'alt pub' },
        ctaLabel: 'Enquire →', ctaHref: 'tel:+914412345678', contact: { name: 'Asha', phone: '+914412345678', email: 'a@b.co' },
      })
      expect(res.headers['cache-control']).toBe('public, max-age=0, s-maxage=60')
    })

    it('detail returns a published service and 404s when missing or unpublished', async () => {
      const s = await create({ title: 'Visible' })
      await api.patch(`/services/${s.id}/publish`).send({ isPublished: true }).expect(200)
      const ok = await publicGet('/public/services/visible').expect(200)
      expect(publicServiceSchema.parse(ok.body.data)).toMatchObject({ slug: 'visible', title: 'Visible', contact: { name: '', phone: '', email: '' } })
      await api.patch(`/services/${s.id}/publish`).send({ isPublished: false }).expect(200)
      const hidden = await publicGet('/public/services/visible').expect(404)
      expect(hidden.body.error.code).toBe('NOT_FOUND')
      await publicGet('/public/services/nope').expect(404)
    })

    it('search shows a Services group for published title or summary matches only', async () => {
      const a = await create({ title: 'Gallery on rent', summary: 'Hire the Chennai gallery' })
      const b = await create({ title: 'Art for rent', summary: 'Offices' })
      await create({ title: 'Hidden rental', summary: 'draft rental' })
      await api.patch(`/services/${a.id}/publish`).send({ isPublished: true }).expect(200)
      await api.patch(`/services/${b.id}/publish`).send({ isPublished: true }).expect(200)
      const res = await publicGet('/public/search?q=rent').expect(200)
      expect(publicSearchSchema.parse(res.body.data).groups).toEqual([
        { label: 'Services', items: [{ label: 'Gallery on rent', href: '/services/gallery-on-rent' }, { label: 'Art for rent', href: '/services/art-for-rent' }] },
      ])
      const bySummary = await publicGet('/public/search?q=chennai').expect(200)
      expect(publicSearchSchema.parse(bySummary.body.data).groups.map((g) => g.label)).toEqual(['Services'])
    })
  })
})
