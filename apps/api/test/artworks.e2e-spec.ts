import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

describe('artworks', () => {
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
  const makeVideo = (key: string) =>
    prisma.media.create({
      data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/${key}`, width: 0, height: 0, mime: 'video/mp4', kind: 'VIDEO', bytes: 1, alt: key },
    })
  const makeArtist = (name: string) => prisma.artist.create({ data: { slug: name.toLowerCase(), name, sortName: name } })
  async function addWork(artistId: string, title: string, over: Record<string, unknown> = {}) {
    const res = await authed.post(`/artists/${artistId}/artworks`).send({ title, ...over }).expect(201)
    return res.body.data as { id: string; sortOrder: number }
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

  const ghost = '11111111-1111-4111-8111-111111111111'

  it('rejects a video as the artwork image -> 400 INVALID_MEDIA_KIND on create and update', async () => {
    const a = await makeArtist('Ana')
    const video = await makeVideo('clip.mp4')
    const bad = await authed.post(`/artists/${a.id}/artworks`).send({ title: 'x', imageId: video.id }).expect(400)
    expect(bad.body.error.code).toBe('INVALID_MEDIA_KIND')
    expect(bad.body.error.message).toBe('image must be an image')
    const work = await addWork(a.id, 'ok')
    const upd = await authed.patch(`/artworks/${work.id}`).send({ title: 'ok', imageId: video.id }).expect(400)
    expect(upd.body.error.code).toBe('INVALID_MEDIA_KIND')
  })

  it('create appends sortOrder, embeds image, revalidates owning artist', async () => {
    const a = await makeArtist('Ana')
    const m = await makeMedia('w1')
    const first = await addWork(a.id, 'One', { imageId: m.id, year: '2020' })
    const second = await addWork(a.id, 'Two')
    expect([first.sortOrder, second.sortOrder]).toEqual([0, 1])
    const list = await authed.get(`/artists/${a.id}/artworks`).expect(200)
    expect(list.body.data.map((w: { title: string }) => w.title)).toEqual(['One', 'Two'])
    expect(list.body.data[0]).toMatchObject({ year: '2020', image: { id: m.id, url: 'https://m.test/w1' } })
    expect(list.body.data[1].image).toBeNull()
    expect(postedTags()).toContain('artist:ana')
  })

  it('unknown artist -> 404, unknown image -> 400 UNKNOWN_MEDIA, bad body -> 400 fields', async () => {
    await authed.get(`/artists/${ghost}/artworks`).expect(404)
    await authed.post(`/artists/${ghost}/artworks`).send({ title: 'x' }).expect(404)
    const a = await makeArtist('Ana')
    const bad = await authed.post(`/artists/${a.id}/artworks`).send({ title: 'x', imageId: ghost }).expect(400)
    expect(bad.body.error.code).toBe('UNKNOWN_MEDIA')
    const inv = await authed.post(`/artists/${a.id}/artworks`).send({ title: '' }).expect(400)
    expect(inv.body.error.fields.title).toBeDefined()
    await http().get(`/artists/${a.id}/artworks`).expect(401)
  })

  it('PATCH updates fields but not isPublished/sortOrder; publish endpoint toggles', async () => {
    const a = await makeArtist('Ana')
    const w = await addWork(a.id, 'One')
    const res = await authed.patch(`/artworks/${w.id}`).send({ title: 'Uno', isPublished: true, sortOrder: 9 }).expect(200)
    expect(res.body.data).toMatchObject({ title: 'Uno', isPublished: false, sortOrder: 0 })
    const pub = await authed.patch(`/artworks/${w.id}/publish`).send({ isPublished: true }).expect(200)
    expect(pub.body.data.isPublished).toBe(true)
    await authed.patch(`/artworks/${ghost}`).send({ title: 'x' }).expect(404)
  })

  it('reorder writes new order; wrong set -> 400 INVALID_ORDER', async () => {
    const a = await makeArtist('Ana')
    const b = await makeArtist('Bob')
    const [w1, w2, w3] = [await addWork(a.id, 'One'), await addWork(a.id, 'Two'), await addWork(a.id, 'Three')]
    const other = await addWork(b.id, 'Other')
    const res = await authed.put(`/artists/${a.id}/artworks/order`).send({ ids: [w3.id, w1.id, w2.id] }).expect(200)
    expect(res.body.data.map((w: { title: string }) => w.title)).toEqual(['Three', 'One', 'Two'])
    for (const ids of [[w1.id, w2.id], [w1.id, w2.id, w3.id, other.id], [w1.id, w1.id, w2.id]]) {
      const bad = await authed.put(`/artists/${a.id}/artworks/order`).send({ ids }).expect(400)
      expect(bad.body.error.code).toBe('INVALID_ORDER')
    }
    await authed.put(`/artists/${a.id}/artworks/order`).send({ ids: ['nope'] }).expect(400)
  })

  it('delete removes the artwork', async () => {
    const a = await makeArtist('Ana')
    const w = await addWork(a.id, 'One')
    await authed.del(`/artworks/${w.id}`).expect(200)
    expect(await prisma.artwork.count()).toBe(0)
    await authed.del(`/artworks/${w.id}`).expect(404)
  })

  it('delete artwork imported into an exhibition -> 409 ARTWORK_IN_USE', async () => {
    const a = await makeArtist('Ana')
    const m = await makeMedia('w1')
    const w = await addWork(a.id, 'One', { imageId: m.id })
    const ex = await prisma.exhibition.create({
      data: { slug: 'show', title: 'Show', city: 'X', country: 'Y', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-01') },
    })
    await prisma.exhibitionWork.create({ data: { exhibitionId: ex.id, artistId: a.id, artworkId: w.id, imageId: m.id, title: 'One', sortOrder: 0 } })
    const res = await authed.del(`/artworks/${w.id}`).expect(409)
    expect(res.body.error.code).toBe('ARTWORK_IN_USE')
    expect(await prisma.artwork.count()).toBe(1)
  })
})
