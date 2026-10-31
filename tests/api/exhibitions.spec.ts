import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient, call, type CallResult } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const GHOST_ID = '00000000-0000-4000-8000-000000000001'
const MISSING_ID = '00000000-0000-4000-8000-000000000000'
const UNKNOWN_MEDIA_ID = '3f2b8c1e-8a52-4f0e-9d3b-1c2d3e4f5a6b'

const baseInput = (over: Record<string, unknown> = {}) => ({
  title: 'Tidewater',
  city: 'Mumbai',
  country: 'India',
  type: 'SOLO',
  startDate: '2026-12-01',
  endDate: '2027-01-15',
  ...over,
})

/** Asserts the status (showing the body on mismatch) and hands the response back. */
function expectStatus(res: CallResult, status: number): CallResult {
  expect(res.status, JSON.stringify(res.body)).toBe(status)
  return res
}

describe('exhibitions', () => {
  let cookie: string
  const authed = authedClient(() => cookie)
  const revalidateMock = vi.mocked(revalidateSite)

  async function makeMedia(key: string) {
    return prisma.media.create({
      data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/t-${key}`, width: 10, height: 10, mime: 'image/jpeg', bytes: 1, alt: key },
    })
  }
  const makeVideo = (key: string) =>
    prisma.media.create({ data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/${key}`, width: 0, height: 0, mime: 'video/mp4', kind: 'VIDEO', bytes: 1, alt: key } })
  async function makeArtist(name: string) {
    return prisma.artist.create({ data: { slug: name.toLowerCase(), name, sortName: name } })
  }
  async function create(over: Record<string, unknown> = {}) {
    const res = expectStatus(await authed.post('/api/exhibitions', baseInput(over)), 201)
    return res.body.data as { id: string; slug: string }
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

  it('creates with derived slug and status UPCOMING', async () => {
    const res = expectStatus(await authed.post('/api/exhibitions', baseInput()), 201)
    expect(res.body.data).toMatchObject({ slug: 'tidewater', status: 'UPCOMING', statusLabel: 'Upcoming', datesLabel: null, datesLabelResolved: 'December 1, 2026 – January 15, 2027' })
    expect(await prisma.exhibition.count()).toBe(1)
  })

  it('second exhibition titled "Tidewater" gets slug tidewater-2', async () => {
    await create()
    const second = await create()
    expect(second.slug).toBe('tidewater-2')
  })

  it('end before start -> 400 fields.endDate', async () => {
    const res = expectStatus(await authed.post('/api/exhibitions', baseInput({ endDate: '2026-11-01' })), 400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(res.body.error.fields.endDate).toBeDefined()
  })

  it('unauthenticated -> 401', async () => {
    expect((await call('GET', '/api/exhibitions')).status).toBe(401)
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
    const res = expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [b.id, a.id] }), 200)
    expect(res.body.data.artistLine).toBe('Bb, Aa')
    expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [a.id] }), 200)
    expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(1)
  })

  it('get returns heroImage and 404 for unknown id', async () => {
    const hero = await makeMedia('hero')
    const ex = await create({ heroImageId: hero.id })
    const res = expectStatus(await authed.get(`/api/exhibitions/${ex.id}`), 200)
    expect(res.body.data.heroImage).toMatchObject({ id: hero.id, url: 'https://m.test/hero' })
    const missing = expectStatus(await authed.get(`/api/exhibitions/${MISSING_ID}`), 404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
  })

  it('list filters by computed status, city, published, q and paginates with meta', async () => {
    await create({ title: 'Future', startDate: '2026-12-01', endDate: '2027-01-01' })
    await create({ title: 'Now Show', city: 'Delhi', startDate: '2026-10-01', endDate: '2026-11-30', isPublished: true })
    await create({ title: 'Old', startDate: '2025-01-01', endDate: '2025-02-01' })
    await create({ title: 'Forced', startDate: '2025-01-01', endDate: '2025-02-01', statusOverride: 'CURRENT' })
    const titles = (r: CallResult) => (r.body.data as { title: string }[]).map((e) => e.title)
    const list = async (query: string) => titles(expectStatus(await authed.get(`/api/exhibitions?${query}`), 200))

    expect((await list('status=current')).sort()).toEqual(['Forced', 'Now Show'])
    expect(await list('status=past')).toEqual(['Old'])
    expect(await list('status=upcoming')).toEqual(['Future'])
    expect(await list('city=Delhi')).toEqual(['Now Show'])
    expect(await list('published=true')).toEqual(['Now Show'])
    expect(await list('q=fut')).toEqual(['Future'])
    const page = expectStatus(await authed.get('/api/exhibitions?limit=2&page=2'), 200)
    expect(page.body.data).toHaveLength(2)
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 4 })
  })

  it('update with changed slug revalidates old and new slugs', async () => {
    const ex = await create()
    revalidateMock.mockClear()
    const res = expectStatus(await authed.patch(`/api/exhibitions/${ex.id}`, baseInput({ slug: 'new-name' })), 200)
    expect(res.body.data.slug).toBe('new-name')
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'exhibition:new-name']))
  })

  it('update keeping its own slug does not suffix it', async () => {
    const ex = await create()
    const res = expectStatus(await authed.patch(`/api/exhibitions/${ex.id}`, baseInput({ slug: 'tidewater', city: 'Pune' })), 200)
    expect(res.body.data).toMatchObject({ slug: 'tidewater', city: 'Pune' })
  })

  it('write revalidates the exhibition tags once', async () => {
    revalidateMock.mockClear()
    await create()
    expect(revalidateMock).toHaveBeenCalledTimes(1)
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibitions', 'exhibition:tidewater']))
  })

  it('publish toggles one row and revalidates', async () => {
    const ex = await create()
    revalidateMock.mockClear()
    const res = expectStatus(await authed.patch(`/api/exhibitions/${ex.id}/publish`, { isPublished: true }), 200)
    expect(res.body.data.isPublished).toBe(true)
    expect(postedTags()).toContain('exhibition:tidewater')
  })

  it('bulk publish flips three rows', async () => {
    const ids = [(await create()).id, (await create()).id, (await create()).id]
    revalidateMock.mockClear()
    const res = expectStatus(await authed.patch('/api/exhibitions/publish', { ids, isPublished: true }), 200)
    expect(res.body.data).toEqual({ updated: 3 })
    expect(await prisma.exhibition.count({ where: { isPublished: true } })).toBe(3)
    expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'exhibition:tidewater-2', 'exhibition:tidewater-3']))
  })

  it('delete cascades joins and works and revalidates', async () => {
    const artist = await makeArtist('Aa')
    const img = await makeMedia('w')
    const ex = await create({ artistIds: [artist.id] })
    expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, { imageId: img.id, title: 'W', artistId: artist.id }), 201)
    revalidateMock.mockClear()
    const res = expectStatus(await authed.del(`/api/exhibitions/${ex.id}`), 200)
    expect(res.body.data).toEqual({ id: ex.id })
    expect(await prisma.exhibition.count()).toBe(0)
    expect(await prisma.exhibitionWork.count()).toBe(0)
    expect(await prisma.exhibitionArtist.count()).toBe(0)
    expect(postedTags()).toContain('exhibition:tidewater')
  })

  it('bad list query -> 400 VALIDATION with fields', async () => {
    const res = expectStatus(await authed.get('/api/exhibitions?status=BOGUS&published=maybe'), 400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(res.body.error.fields).toEqual(expect.objectContaining({ status: expect.any(String), published: expect.any(String) }))
    expectStatus(await authed.get('/api/exhibitions?city=a&city=b'), 400)
  })

  it('status filter and resolved status agree on the boundary days', async () => {
    await create({ title: 'Starts today', startDate: '2026-10-30', endDate: '2026-12-01' })
    await create({ title: 'Ends today', startDate: '2026-09-01', endDate: '2026-10-30' })
    const res = expectStatus(await authed.get('/api/exhibitions?status=current'), 200)
    expect((res.body.data as { title: string; status: string }[]).map((e) => [e.title, e.status]).sort()).toEqual([
      ['Ends today', 'CURRENT'],
      ['Starts today', 'CURRENT'],
    ])
  })

  it('create dedupes artistIds; unknown artist and hero image -> 400', async () => {
    const a = await makeArtist('Aa')
    const ex = await create({ artistIds: [a.id, a.id] })
    expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(1)
    const bad = expectStatus(await authed.post('/api/exhibitions', baseInput({ artistIds: [GHOST_ID] })), 400)
    expect(bad.body.error.code).toBe('UNKNOWN_ARTIST')
    expect(bad.body.error.details.missingIds).toEqual([GHOST_ID])
    const hero = expectStatus(await authed.post('/api/exhibitions', baseInput({ heroImageId: GHOST_ID })), 400)
    expect(hero.body.error.code).toBe('UNKNOWN_MEDIA')
    expect(await prisma.exhibition.count()).toBe(1)
  })

  it('rejects a video as the hero image -> 400 INVALID_MEDIA_KIND', async () => {
    const video = await makeVideo('hero.mp4')
    const res = expectStatus(await authed.post('/api/exhibitions', baseInput({ heroImageId: video.id })), 400)
    expect(res.body.error.code).toBe('INVALID_MEDIA_KIND')
    expect(res.body.error.message).toBe('hero image must be an image')
    expect(await prisma.exhibition.count()).toBe(0)
  })

  it('setArtists dedupes and rejects unknown ids', async () => {
    const a = await makeArtist('Aa')
    const ex = await create()
    expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [a.id, a.id] }), 200)
    expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(1)
    const res = expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [a.id, GHOST_ID] }), 400)
    expect(res.body.error.code).toBe('UNKNOWN_ARTIST')
    expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(1)
  })

  it('PATCH keeps isPublished and artists when omitted', async () => {
    const a = await makeArtist('Aa')
    const ex = await create({ artistIds: [a.id], isPublished: true })
    const res = expectStatus(await authed.patch(`/api/exhibitions/${ex.id}`, baseInput({ city: 'Pune' })), 200)
    expect(res.body.data).toMatchObject({ isPublished: true, city: 'Pune' })
    expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(1)
  })

  it('bulk publish with an unknown id -> 404 with details.missingIds and no changes', async () => {
    const ex = await create()
    const res = expectStatus(await authed.patch('/api/exhibitions/publish', { ids: [ex.id, GHOST_ID], isPublished: true }), 404)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.details.missingIds).toEqual([GHOST_ID])
    expect(await prisma.exhibition.count({ where: { isPublished: true } })).toBe(0)
  })

  it('reorder rejects partial, duplicate and foreign ids -> 400 INVALID_ORDER', async () => {
    const artist = await makeArtist('Aa')
    const img = await makeMedia('w')
    const ex = await create({ artistIds: [artist.id] })
    const other = await create({ artistIds: [artist.id] })
    const mk = async (exId: string) =>
      expectStatus(await authed.post(`/api/exhibitions/${exId}/works`, { imageId: img.id, title: 't', artistId: artist.id }), 201).body.data.id as string
    const [w1, w2, foreign] = [await mk(ex.id), await mk(ex.id), await mk(other.id)]
    for (const ids of [[w1], [w1, w1], [w1, foreign], [w1, w2, foreign]]) {
      const res = expectStatus(await authed.put(`/api/exhibitions/${ex.id}/works/order`, { ids }), 400)
      expect(res.body.error.code).toBe('INVALID_ORDER')
    }
  })

  describe('revalidation fan-out', () => {
    it('create, publish and delete also revalidate every linked artist', async () => {
      const a = await makeArtist('Aa')
      const b = await makeArtist('Bb')
      revalidateMock.mockClear()
      const ex = await create({ artistIds: [a.id, b.id] })
      expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'artist:aa', 'artist:bb']))
      revalidateMock.mockClear()
      expectStatus(await authed.patch(`/api/exhibitions/${ex.id}/publish`, { isPublished: true }), 200)
      expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'artist:aa', 'artist:bb']))
      revalidateMock.mockClear()
      expectStatus(await authed.del(`/api/exhibitions/${ex.id}`), 200)
      expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'artist:aa', 'artist:bb']))
    })

    it('update revalidates the old slug, the new slug and the artists', async () => {
      const a = await makeArtist('Aa')
      const ex = await create({ artistIds: [a.id] })
      revalidateMock.mockClear()
      expectStatus(await authed.patch(`/api/exhibitions/${ex.id}`, baseInput({ slug: 'renamed' })), 200)
      expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'exhibition:renamed', 'artist:aa']))
    })

    it('setArtists revalidates both the removed and the added artists', async () => {
      const a = await makeArtist('Aa')
      const b = await makeArtist('Bb')
      const ex = await create({ artistIds: [a.id] })
      revalidateMock.mockClear()
      expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [b.id] }), 200)
      expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'artist:aa', 'artist:bb']))
    })

    it('work changes revalidate the exhibition artists', async () => {
      const a = await makeArtist('Aa')
      const img = await makeMedia('w')
      const ex = await create({ artistIds: [a.id] })
      revalidateMock.mockClear()
      expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, { imageId: img.id, title: 'W', artistId: a.id }), 201)
      expect(postedTags()).toEqual(expect.arrayContaining(['exhibition:tidewater', 'artist:aa']))
    })
  })

  describe('works', () => {
    it('work with an artist outside the exhibition -> 400 WORK_ARTIST_NOT_IN_EXHIBITION', async () => {
      const inside = await makeArtist('In')
      const outside = await makeArtist('Out')
      const img = await makeMedia('w')
      const ex = await create({ artistIds: [inside.id] })
      const res = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, { imageId: img.id, title: 'W', artistId: outside.id }), 400)
      expect(res.body.error.code).toBe('WORK_ARTIST_NOT_IN_EXHIBITION')
      expect(await prisma.exhibitionWork.count()).toBe(0)
      const created = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, { imageId: img.id, title: 'W', artistId: inside.id }), 201)
      expect(created.body.data).toMatchObject({ title: 'W', artistId: inside.id })
      expectStatus(await authed.patch(`/api/works/${created.body.data.id}`, { imageId: img.id, title: 'W', artistId: outside.id }), 400)
    })

    it('import copies artwork fields and keeps artworkId', async () => {
      const artist = await makeArtist('Aa')
      const img = await makeMedia('w')
      const artwork = await prisma.artwork.create({ data: { artistId: artist.id, title: 'Blue', year: '2020', medium: 'Oil', imageId: img.id } })
      const ex = await create({ artistIds: [artist.id] })
      const res = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works/import`, { artworkId: artwork.id }), 201)
      expect(res.body.data).toMatchObject({ title: 'Blue', year: '2020', medium: 'Oil', imageId: img.id, artistId: artist.id, artworkId: artwork.id })
    })

    it('import of an artwork without image -> 400', async () => {
      const artist = await makeArtist('Aa')
      const artwork = await prisma.artwork.create({ data: { artistId: artist.id, title: 'Blue' } })
      const ex = await create({ artistIds: [artist.id] })
      const res = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works/import`, { artworkId: artwork.id }), 400)
      expect(res.body.error.code).toBe('ARTWORK_HAS_NO_IMAGE')
    })

    it('import of an unknown artwork -> 404', async () => {
      const artist = await makeArtist('Aa')
      const ex = await create({ artistIds: [artist.id] })
      const res = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works/import`, { artworkId: GHOST_ID }), 404)
      expect(res.body.error.message).toBe('Artwork not found')
    })

    it('works order persists, list is sorted, update and delete work', async () => {
      const artist = await makeArtist('Aa')
      const img = await makeMedia('w')
      const ex = await create({ artistIds: [artist.id] })
      const ids: string[] = []
      for (const title of ['one', 'two', 'three']) {
        const res = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, { imageId: img.id, title, artistId: artist.id }), 201)
        ids.push(res.body.data.id)
      }
      const reversed = [...ids].reverse()
      expectStatus(await authed.put(`/api/exhibitions/${ex.id}/works/order`, { ids: reversed }), 200)
      const list = expectStatus(await authed.get(`/api/exhibitions/${ex.id}/works`), 200)
      expect((list.body.data as { id: string }[]).map((w) => w.id)).toEqual(reversed)
      revalidateMock.mockClear()
      const upd = expectStatus(await authed.patch(`/api/works/${ids[0]}`, { imageId: img.id, title: 'renamed', artistId: artist.id }), 200)
      expect(upd.body.data.title).toBe('renamed')
      expect(postedTags()).toContain('exhibition:tidewater')
      const removed = expectStatus(await authed.del(`/api/works/${ids[0]}`), 200)
      expect(removed.body.data).toEqual({ id: ids[0] })
      expect(await prisma.exhibitionWork.count()).toBe(2)
    })

    it('unknown exhibition and unknown work -> 404', async () => {
      expectStatus(await authed.get(`/api/exhibitions/${MISSING_ID}/works`), 404)
      expectStatus(await authed.del(`/api/works/${MISSING_ID}`), 404)
    })

    it('rejects a video or unknown media as the work image on create and update', async () => {
      const artist = await makeArtist('Aa')
      const img = await makeMedia('w')
      const video = await makeVideo('v.mp4')
      const ex = await create({ artistIds: [artist.id] })
      const body = (imageId: string) => ({ imageId, title: 'W', artistId: artist.id })
      const kind = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, body(video.id)), 400)
      expect(kind.body.error.code).toBe('INVALID_MEDIA_KIND')
      const unknown = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, body(UNKNOWN_MEDIA_ID)), 400)
      expect(unknown.body.error.code).toBe('UNKNOWN_MEDIA')
      expect(await prisma.exhibitionWork.count()).toBe(0)
      const created = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, body(img.id)), 201)
      const upd = expectStatus(await authed.patch(`/api/works/${created.body.data.id}`, body(video.id)), 400)
      expect(upd.body.error.code).toBe('INVALID_MEDIA_KIND')
      const missing = expectStatus(await authed.patch(`/api/works/${created.body.data.id}`, body(UNKNOWN_MEDIA_ID)), 400)
      expect(missing.body.error.code).toBe('UNKNOWN_MEDIA')
    })

    it('setArtists refuses to drop an artist who still has works -> 409 ARTIST_HAS_WORKS', async () => {
      const keep = await makeArtist('Keep')
      const drop = await makeArtist('Drop')
      const img = await makeMedia('w')
      const ex = await create({ artistIds: [keep.id, drop.id] })
      const work = expectStatus(await authed.post(`/api/exhibitions/${ex.id}/works`, { imageId: img.id, title: 'W', artistId: drop.id }), 201)
      const res = expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [keep.id] }), 409)
      expect(res.body.error.code).toBe('ARTIST_HAS_WORKS')
      expect(res.body.error.details.artistIds).toEqual([drop.id])
      expect(await prisma.exhibitionArtist.count({ where: { exhibitionId: ex.id } })).toBe(2)
      expectStatus(await authed.del(`/api/works/${work.body.data.id}`), 200)
      expectStatus(await authed.put(`/api/exhibitions/${ex.id}/artists`, { ids: [keep.id] }), 200)
    })
  })
})
