import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { env } from '../src/config/env'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

jest.mock('../src/config/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))

const baseInput = (over: Record<string, unknown> = {}) => ({
  title: 'Tidewater',
  city: 'Mumbai',
  country: 'India',
  type: 'SOLO',
  startDate: '2026-12-01',
  endDate: '2027-01-15',
  ...over,
})

describe('exhibitions', () => {
  let app: INestApplication
  let prisma: PrismaService
  let cookie: string
  let fetchMock: jest.Mock
  const realFetch = globalThis.fetch
  const http = () => request(app.getHttpServer())
  const authed = {
    get: (p: string) => http().get(p).set('Cookie', cookie),
    post: (p: string) => http().post(p).set('Cookie', cookie),
    put: (p: string) => http().put(p).set('Cookie', cookie),
    patch: (p: string) => http().patch(p).set('Cookie', cookie),
    del: (p: string) => http().delete(p).set('Cookie', cookie),
  }

  async function makeMedia(key: string) {
    return prisma.media.create({
      data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/t-${key}`, width: 10, height: 10, mime: 'image/jpeg', bytes: 1, alt: key },
    })
  }
  async function makeArtist(name: string) {
    return prisma.artist.create({ data: { slug: name.toLowerCase(), name, sortName: name } })
  }
  async function create(over: Record<string, unknown> = {}) {
    const res = await authed.post('/exhibitions').send(baseInput(over)).expect(201)
    return res.body.data as { id: string; slug: string }
  }
  const postedTags = () =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse((init as RequestInit).body as string) as { tags: string[] }).tags)

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
    prisma = app.get(PrismaService)
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

  it('creates with derived slug and status UPCOMING', async () => {
    const res = await authed.post('/exhibitions').send(baseInput()).expect(201)
    expect(res.body.data).toMatchObject({ slug: 'tidewater', status: 'UPCOMING', statusLabel: 'Upcoming', datesLabel: 'December 1, 2026 – January 15, 2027' })
    expect(await prisma.exhibition.count()).toBe(1)
  })

  it('second exhibition titled "Tidewater" gets slug tidewater-2', async () => {
    await create()
    const second = await create()
    expect(second.slug).toBe('tidewater-2')
  })

  it('end before start -> 400 fields.endDate', async () => {
    const res = await authed.post('/exhibitions').send(baseInput({ endDate: '2026-11-01' })).expect(400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(res.body.error.fields.endDate).toBeDefined()
  })

  it('unauthenticated -> 401', async () => {
    await http().get('/exhibitions').expect(401)
  })

  it('create with artistIds writes join rows in order', async () => {
    const [a, b] = [await makeArtist('Aa'), await makeArtist('Bb')]
    const ex = await create({ artistIds: [b.id, a.id] })
    const rows = await prisma.exhibitionArtist.findMany({ where: { exhibitionId: ex.id }, orderBy: { sortOrder: 'asc' } })
    expect(rows.map((r) => r.artistId)).toEqual([b.id, a.id])
  })

  it('setArtists stores order and artistLine follows it', async () => {
    const [a, b] = [await makeArtist('Aa'), await makeArtist('Bb')]
    const ex = await create()
    const res = await authed.put(`/exhibitions/${ex.id}/artists`).send({ ids: [b.id, a.id] }).expect(200)
    expect(res.body.data.artistLine).toBe('Bb, Aa')
    await authed.put(`/exhibitions/${ex.id}/artists`).send({ ids: [a.id] }).expect(200)
    expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(1)
  })

  it('get returns heroImage and 404 for unknown id', async () => {
    const hero = await makeMedia('hero')
    const ex = await create({ heroImageId: hero.id })
    const res = await authed.get(`/exhibitions/${ex.id}`).expect(200)
    expect(res.body.data.heroImage).toMatchObject({ id: hero.id, url: 'https://m.test/hero' })
    const missing = await authed.get('/exhibitions/00000000-0000-4000-8000-000000000000').expect(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
  })

  it('list filters by computed status, city, published, q and paginates with meta', async () => {
    await create({ title: 'Future', startDate: '2026-12-01', endDate: '2027-01-01' })
    await create({ title: 'Now Show', city: 'Delhi', startDate: '2026-10-01', endDate: '2026-11-30', isPublished: true })
    await create({ title: 'Old', startDate: '2025-01-01', endDate: '2025-02-01' })
    await create({ title: 'Forced', startDate: '2025-01-01', endDate: '2025-02-01', statusOverride: 'CURRENT' })
    const titles = (r: request.Response) => (r.body.data as { title: string }[]).map((e) => e.title)

    expect(titles(await authed.get('/exhibitions?status=CURRENT').expect(200)).sort()).toEqual(['Forced', 'Now Show'])
    expect(titles(await authed.get('/exhibitions?status=PAST').expect(200))).toEqual(['Old'])
    expect(titles(await authed.get('/exhibitions?status=UPCOMING').expect(200))).toEqual(['Future'])
    expect(titles(await authed.get('/exhibitions?city=Delhi').expect(200))).toEqual(['Now Show'])
    expect(titles(await authed.get('/exhibitions?published=true').expect(200))).toEqual(['Now Show'])
    expect(titles(await authed.get('/exhibitions?q=fut').expect(200))).toEqual(['Future'])
    const page = await authed.get('/exhibitions?limit=2&page=2').expect(200)
    expect(page.body.data).toHaveLength(2)
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 4 })
  })

  it('update with changed slug revalidates old and new slugs', async () => {
    const ex = await create()
    fetchMock.mockClear()
    const res = await authed.patch(`/exhibitions/${ex.id}`).send(baseInput({ slug: 'new-name' })).expect(200)
    expect(res.body.data.slug).toBe('new-name')
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'exhibition:new-name']))
  })

  it('update keeping its own slug does not suffix it', async () => {
    const ex = await create()
    const res = await authed.patch(`/exhibitions/${ex.id}`).send(baseInput({ slug: 'tidewater', city: 'Pune' })).expect(200)
    expect(res.body.data).toMatchObject({ slug: 'tidewater', city: 'Pune' })
  })

  it('write posts tags to the revalidate URL', async () => {
    fetchMock.mockClear()
    await create()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toMatch(/\/api\/revalidate$/)
    expect((init.headers as Record<string, string>)['x-revalidate-secret']).toBe(env.REVALIDATE_SECRET)
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibitions', 'exhibition:tidewater']))
  })

  it('publish toggles one row and revalidates', async () => {
    const ex = await create()
    fetchMock.mockClear()
    const res = await authed.patch(`/exhibitions/${ex.id}/publish`).send({ isPublished: true }).expect(200)
    expect(res.body.data.isPublished).toBe(true)
    expect(postedTags()).toContain('exhibition:tidewater')
  })

  it('bulk publish flips three rows', async () => {
    const ids = [(await create()).id, (await create()).id, (await create()).id]
    fetchMock.mockClear()
    await authed.patch('/exhibitions/publish').send({ ids, isPublished: true }).expect(200)
    expect(await prisma.exhibition.count({ where: { isPublished: true } })).toBe(3)
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'exhibition:tidewater-2', 'exhibition:tidewater-3']))
  })

  it('delete cascades joins and works and revalidates', async () => {
    const artist = await makeArtist('Aa')
    const img = await makeMedia('w')
    const ex = await create({ artistIds: [artist.id] })
    await authed.post(`/exhibitions/${ex.id}/works`).send({ imageId: img.id, title: 'W', artistId: artist.id }).expect(201)
    fetchMock.mockClear()
    await authed.del(`/exhibitions/${ex.id}`).expect(200)
    expect(await prisma.exhibition.count()).toBe(0)
    expect(await prisma.exhibitionWork.count()).toBe(0)
    expect(await prisma.exhibitionArtist.count()).toBe(0)
    expect(postedTags()).toContain('exhibition:tidewater')
  })

  describe('works', () => {
    it('work with an artist outside the exhibition -> 400 WORK_ARTIST_NOT_IN_EXHIBITION', async () => {
      const inside = await makeArtist('In')
      const outside = await makeArtist('Out')
      const img = await makeMedia('w')
      const ex = await create({ artistIds: [inside.id] })
      const res = await authed.post(`/exhibitions/${ex.id}/works`).send({ imageId: img.id, title: 'W', artistId: outside.id }).expect(400)
      expect(res.body.error.code).toBe('WORK_ARTIST_NOT_IN_EXHIBITION')
      expect(await prisma.exhibitionWork.count()).toBe(0)
      const ok = await authed.post(`/exhibitions/${ex.id}/works`).send({ imageId: img.id, title: 'W', artistId: inside.id }).expect(201)
      expect(ok.body.data).toMatchObject({ title: 'W', artistId: inside.id })
      await authed.patch(`/works/${ok.body.data.id}`).send({ imageId: img.id, title: 'W', artistId: outside.id }).expect(400)
    })

    it('import copies artwork fields and keeps artworkId', async () => {
      const artist = await makeArtist('Aa')
      const img = await makeMedia('w')
      const artwork = await prisma.artwork.create({ data: { artistId: artist.id, title: 'Blue', year: '2020', medium: 'Oil', imageId: img.id } })
      const ex = await create({ artistIds: [artist.id] })
      const res = await authed.post(`/exhibitions/${ex.id}/works/import`).send({ artworkId: artwork.id }).expect(201)
      expect(res.body.data).toMatchObject({ title: 'Blue', year: '2020', medium: 'Oil', imageId: img.id, artistId: artist.id, artworkId: artwork.id })
    })

    it('import of an artwork without image -> 400', async () => {
      const artist = await makeArtist('Aa')
      const artwork = await prisma.artwork.create({ data: { artistId: artist.id, title: 'Blue' } })
      const ex = await create({ artistIds: [artist.id] })
      const res = await authed.post(`/exhibitions/${ex.id}/works/import`).send({ artworkId: artwork.id }).expect(400)
      expect(res.body.error.code).toBe('ARTWORK_HAS_NO_IMAGE')
    })

    it('works order persists, list is sorted, update and delete work', async () => {
      const artist = await makeArtist('Aa')
      const img = await makeMedia('w')
      const ex = await create({ artistIds: [artist.id] })
      const ids: string[] = []
      for (const title of ['one', 'two', 'three']) {
        const res = await authed.post(`/exhibitions/${ex.id}/works`).send({ imageId: img.id, title, artistId: artist.id }).expect(201)
        ids.push(res.body.data.id)
      }
      const reversed = [...ids].reverse()
      await authed.put(`/exhibitions/${ex.id}/works/order`).send({ ids: reversed }).expect(200)
      const list = await authed.get(`/exhibitions/${ex.id}/works`).expect(200)
      expect((list.body.data as { id: string }[]).map((w) => w.id)).toEqual(reversed)
      fetchMock.mockClear()
      const upd = await authed.patch(`/works/${ids[0]}`).send({ imageId: img.id, title: 'renamed', artistId: artist.id }).expect(200)
      expect(upd.body.data.title).toBe('renamed')
      expect(postedTags()).toContain('exhibition:tidewater')
      await authed.del(`/works/${ids[0]}`).expect(200)
      expect(await prisma.exhibitionWork.count()).toBe(2)
    })
  })
})
