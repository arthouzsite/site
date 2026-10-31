import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient, call, type CallResult } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const GHOST_ID = '11111111-1111-4111-8111-111111111111'

/** Asserts the status (showing the body on mismatch) and hands the response back. */
function expectStatus(res: CallResult, status: number): CallResult {
  expect(res.status, JSON.stringify(res.body)).toBe(status)
  return res
}

describe('artworks', () => {
  let cookie: string
  const authed = authedClient(() => cookie)
  const revalidateMock = vi.mocked(revalidateSite)

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
    const res = expectStatus(await authed.post(`/api/artists/${artistId}/artworks`, { title, ...over }), 201)
    return res.body.data as { id: string; sortOrder: number }
  }
  const postedTags = () => revalidateMock.mock.calls.flatMap(([tags]) => tags)

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
    revalidateMock.mockClear()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('rejects a video as the artwork image -> 400 INVALID_MEDIA_KIND on create and update', async () => {
    const a = await makeArtist('Ana')
    const video = await makeVideo('clip.mp4')
    const bad = expectStatus(await authed.post(`/api/artists/${a.id}/artworks`, { title: 'x', imageId: video.id }), 400)
    expect(bad.body.error.code).toBe('INVALID_MEDIA_KIND')
    expect(bad.body.error.message).toBe('image must be an image')
    const work = await addWork(a.id, 'ok')
    const upd = expectStatus(await authed.patch(`/api/artworks/${work.id}`, { title: 'ok', imageId: video.id }), 400)
    expect(upd.body.error.code).toBe('INVALID_MEDIA_KIND')
  })

  it('create appends sortOrder, embeds image, revalidates owning artist', async () => {
    const a = await makeArtist('Ana')
    const m = await makeMedia('w1')
    const first = await addWork(a.id, 'One', { imageId: m.id, year: '2020' })
    const second = await addWork(a.id, 'Two')
    expect([first.sortOrder, second.sortOrder]).toEqual([0, 1])
    const list = expectStatus(await authed.get(`/api/artists/${a.id}/artworks`), 200)
    expect(list.body.data.map((w: { title: string }) => w.title)).toEqual(['One', 'Two'])
    expect(list.body.data[0]).toMatchObject({ year: '2020', image: { id: m.id, url: 'https://m.test/w1' } })
    expect(list.body.data[1].image).toBeNull()
    expect(postedTags()).toContain('artist:ana')
  })

  it('unknown artist -> 404, unknown image -> 400 UNKNOWN_MEDIA, bad body -> 400 fields', async () => {
    expectStatus(await authed.get(`/api/artists/${GHOST_ID}/artworks`), 404)
    expectStatus(await authed.post(`/api/artists/${GHOST_ID}/artworks`, { title: 'x' }), 404)
    const a = await makeArtist('Ana')
    const bad = expectStatus(await authed.post(`/api/artists/${a.id}/artworks`, { title: 'x', imageId: GHOST_ID }), 400)
    expect(bad.body.error.code).toBe('UNKNOWN_MEDIA')
    const inv = expectStatus(await authed.post(`/api/artists/${a.id}/artworks`, { title: '' }), 400)
    expect(inv.body.error.fields.title).toBeDefined()
    expect((await call('GET', `/api/artists/${a.id}/artworks`)).status).toBe(401)
  })

  it('PATCH updates fields but not isPublished/sortOrder; publish endpoint toggles', async () => {
    const a = await makeArtist('Ana')
    const w = await addWork(a.id, 'One')
    const res = expectStatus(await authed.patch(`/api/artworks/${w.id}`, { title: 'Uno', isPublished: true, sortOrder: 9 }), 200)
    expect(res.body.data).toMatchObject({ title: 'Uno', isPublished: false, sortOrder: 0 })
    const pub = expectStatus(await authed.patch(`/api/artworks/${w.id}/publish`, { isPublished: true }), 200)
    expect(pub.body.data.isPublished).toBe(true)
    expectStatus(await authed.patch(`/api/artworks/${GHOST_ID}`, { title: 'x' }), 404)
    expectStatus(await authed.patch(`/api/artworks/${GHOST_ID}/publish`, { isPublished: true }), 404)
  })

  it('reorder writes new order; wrong set -> 400 INVALID_ORDER', async () => {
    const a = await makeArtist('Ana')
    const b = await makeArtist('Bob')
    const [w1, w2, w3] = [await addWork(a.id, 'One'), await addWork(a.id, 'Two'), await addWork(a.id, 'Three')]
    const other = await addWork(b.id, 'Other')
    const res = expectStatus(await authed.put(`/api/artists/${a.id}/artworks/order`, { ids: [w3.id, w1.id, w2.id] }), 200)
    expect(res.body.data.map((w: { title: string }) => w.title)).toEqual(['Three', 'One', 'Two'])
    for (const ids of [[w1.id, w2.id], [w1.id, w2.id, w3.id, other.id], [w1.id, w1.id, w2.id]]) {
      const bad = expectStatus(await authed.put(`/api/artists/${a.id}/artworks/order`, { ids }), 400)
      expect(bad.body.error.code).toBe('INVALID_ORDER')
    }
    expectStatus(await authed.put(`/api/artists/${a.id}/artworks/order`, { ids: ['nope'] }), 400)
  })

  it('delete removes the artwork', async () => {
    const a = await makeArtist('Ana')
    const w = await addWork(a.id, 'One')
    const res = expectStatus(await authed.del(`/api/artworks/${w.id}`), 200)
    expect(res.body.data).toEqual({ id: w.id })
    expect(await prisma.artwork.count()).toBe(0)
    expectStatus(await authed.del(`/api/artworks/${w.id}`), 404)
  })

  it('delete artwork imported into an exhibition -> 409 ARTWORK_IN_USE', async () => {
    const a = await makeArtist('Ana')
    const m = await makeMedia('w1')
    const w = await addWork(a.id, 'One', { imageId: m.id })
    const ex = await prisma.exhibition.create({
      data: { slug: 'show', title: 'Show', city: 'X', country: 'Y', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-01') },
    })
    await prisma.exhibitionWork.create({ data: { exhibitionId: ex.id, artistId: a.id, artworkId: w.id, imageId: m.id, title: 'One', sortOrder: 0 } })
    const res = expectStatus(await authed.del(`/api/artworks/${w.id}`), 409)
    expect(res.body.error.code).toBe('ARTWORK_IN_USE')
    expect(await prisma.artwork.count()).toBe(1)
  })
})
