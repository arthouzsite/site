import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

const revalidateSite = vi.hoisted(() => vi.fn<(tags: string[]) => void>())
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite }))

const GHOST_ID = '11111111-1111-4111-8111-111111111111'

describe('artists', () => {
  let cookie = ''
  const client = authedClient(() => cookie)

  async function makeMedia(key: string) {
    return prisma.media.create({
      data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/t-${key}`, width: 10, height: 10, mime: 'image/jpeg', bytes: 1, alt: key },
    })
  }
  async function make(name: string, over: Record<string, unknown> = {}) {
    const res = await client.post('/api/artists', { name, ...over })
    expect(res.status).toBe(201)
    return res.body.data as { id: string; slug: string; sortName: string }
  }
  const postedTags = () => revalidateSite.mock.calls.flatMap(([tags]) => tags)

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
    revalidateSite.mockReset()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('sortName defaults to name, slug derived, response has mapper fields', async () => {
    const a = await make('Kavya Rao')
    expect(a).toMatchObject({ slug: 'kavya-rao', sortName: 'Kavya Rao', indexLetter: 'K', artworkCount: 0, portraitImage: null, isPublished: false })
    const b = await make('Kavya Rao', { sortName: '  Rao, Kavya ' })
    expect(b).toMatchObject({ slug: 'kavya-rao-2', sortName: 'Rao, Kavya' })
    expect(postedTags()).toContain('artist:kavya-rao')
  })

  it('unknown portrait -> 400 UNKNOWN_MEDIA; known portrait is embedded', async () => {
    const bad = await client.post('/api/artists', { name: 'X', portraitImageId: GHOST_ID })
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('UNKNOWN_MEDIA')
    const m = await makeMedia('p1')
    const a = await client.post('/api/artists', { name: 'Y', portraitImageId: m.id })
    expect(a.status).toBe(201)
    expect(a.body.data.portraitImage).toMatchObject({ id: m.id, url: 'https://m.test/p1' })
  })

  it('GET returns one artist; PATCH renames slug, never touches isPublished/isFeatured/featuredOrder', async () => {
    const a = await make('Old Name')
    expect((await client.patch(`/api/artists/${a.id}/publish`, { isPublished: true })).status).toBe(200)
    expect((await client.patch(`/api/artists/${a.id}/feature`, { isFeatured: true })).status).toBe(200)
    const res = await client.patch(`/api/artists/${a.id}`, { name: 'New Name', isPublished: false, isFeatured: false, featuredOrder: 9 })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ slug: 'new-name', isPublished: true, isFeatured: true, featuredOrder: 1 })
    const got = await client.get(`/api/artists/${a.id}`)
    expect(got.status).toBe(200)
    expect(got.body.data).toMatchObject({ id: a.id, slug: 'new-name' })
  })

  it('validation: bad body -> 400 fields; unauthenticated -> 401; unknown id -> 404', async () => {
    const res = await client.post('/api/artists', { name: '' })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.name).toBeDefined()
    expect((await call('GET', '/api/artists')).status).toBe(401)
    const nf = await client.get(`/api/artists/${GHOST_ID}`)
    expect(nf.status).toBe(404)
    expect(nf.body.error.code).toBeDefined()
  })

  it('list?letter=K returns only K initials, sorted, with meta', async () => {
    for (const n of ['Kiran', 'Anita', 'kabir', 'Zed']) await make(n)
    const res = await client.get('/api/artists?letter=K')
    expect(res.status).toBe(200)
    expect(res.body.data.map((a: { name: string }) => a.name)).toEqual(['kabir', 'Kiran'])
    expect(res.body.meta).toMatchObject({ total: 2, page: 1 })
    const all = await client.get('/api/artists')
    expect(all.status).toBe(200)
    expect(all.body.data.map((a: { name: string }) => a.name)).toEqual(['Anita', 'kabir', 'Kiran', 'Zed'])
  })

  it('list?letter=# returns non-letter initials only; bad letter -> 400', async () => {
    for (const n of ['3 Bears', 'Anita', '_under', 'Éclair']) await make(n)
    const res = await client.get('/api/artists?letter=%23')
    expect(res.status).toBe(200)
    expect(res.body.data.map((a: { name: string }) => a.name).sort()).toEqual(['3 Bears', '_under', 'Éclair'].sort())
    const bad = await client.get('/api/artists?letter=AB')
    expect(bad.status).toBe(400)
    expect(bad.body.error.fields.letter).toBeDefined()
  })

  it('list filters q, featured, published', async () => {
    const a = await make('Alpha')
    await make('Beta')
    await client.patch(`/api/artists/${a.id}/publish`, { isPublished: true })
    await client.patch(`/api/artists/${a.id}/feature`, { isFeatured: true })
    expect((await client.get('/api/artists?q=bet')).body.data).toHaveLength(1)
    expect((await client.get('/api/artists?featured=true')).body.data.map((x: { id: string }) => x.id)).toEqual([a.id])
    expect((await client.get('/api/artists?published=false')).body.data.map((x: { name: string }) => x.name)).toEqual(['Beta'])
  })

  it('featured-order persists featuredOrder 1..n, sets isFeatured, unfeatures others', async () => {
    const [a, b, c] = [await make('A'), await make('B'), await make('C')]
    await client.patch(`/api/artists/${c.id}/feature`, { isFeatured: true })
    const res = await client.put('/api/artists/featured-order', { ids: [b.id, a.id, b.id] })
    expect(res.status).toBe(200)
    const rows = await prisma.artist.findMany({ orderBy: { name: 'asc' } })
    expect(rows.map((r) => [r.name, r.isFeatured, r.featuredOrder])).toEqual([['A', true, 2], ['B', true, 1], ['C', false, 0]])
  })

  it('featured-order unknown id -> 400 UNKNOWN_ARTIST with missingIds; non-uuid -> 400', async () => {
    const res = await client.put('/api/artists/featured-order', { ids: [GHOST_ID] })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatchObject({ code: 'UNKNOWN_ARTIST', details: { missingIds: [GHOST_ID] } })
    expect((await client.put('/api/artists/featured-order', { ids: ['nope'] })).status).toBe(400)
  })

  it('feature toggle appends to end, unfeature removes and compacts', async () => {
    const [a, b, c] = [await make('A'), await make('B'), await make('C')]
    for (const x of [a, b, c]) expect((await client.patch(`/api/artists/${x.id}/feature`, { isFeatured: true })).status).toBe(200)
    const order = async () => (await prisma.artist.findMany({ orderBy: { name: 'asc' } })).map((r) => [r.isFeatured, r.featuredOrder])
    expect(await order()).toEqual([[true, 1], [true, 2], [true, 3]])
    await client.patch(`/api/artists/${a.id}/feature`, { isFeatured: false })
    expect(await order()).toEqual([[false, 0], [true, 1], [true, 2]])
    await client.patch(`/api/artists/${a.id}/feature`, { isFeatured: true })
    expect(await order()).toEqual([[true, 3], [true, 1], [true, 2]])
    expect((await client.patch(`/api/artists/${a.id}/feature`, { isFeatured: 'yes' })).status).toBe(400)
  })

  it('publish toggles and revalidates', async () => {
    const a = await make('Pub')
    const res = await client.patch(`/api/artists/${a.id}/publish`, { isPublished: true })
    expect(res.status).toBe(200)
    expect(res.body.data.isPublished).toBe(true)
    expect(postedTags()).toContain('artist:pub')
  })

  it('delete artist in an exhibition -> 409 ARTIST_IN_USE with details', async () => {
    const a = await make('Used')
    const ex = await prisma.exhibition.create({
      data: { slug: 'show', title: 'Show', city: 'X', country: 'Y', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-01') },
    })
    await prisma.exhibitionArtist.create({ data: { exhibitionId: ex.id, artistId: a.id, sortOrder: 0 } })
    await prisma.artwork.create({ data: { artistId: a.id, title: 'W' } })
    const res = await client.del(`/api/artists/${a.id}`)
    expect(res.status).toBe(409)
    expect(res.body.error).toMatchObject({ code: 'ARTIST_IN_USE', details: { exhibitions: [{ id: ex.id, title: 'Show' }], workCount: 0, artworkCount: 1 } })
    expect(await prisma.artist.count()).toBe(1)
  })

  it('delete unused artist succeeds and revalidates', async () => {
    const a = await make('Free')
    const res = await client.del(`/api/artists/${a.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: a.id })
    expect(await prisma.artist.count()).toBe(0)
    expect(postedTags().filter((t) => t === 'artist:free').length).toBeGreaterThan(1)
  })

  it('update, publish and rename also revalidate the exhibitions that include the artist', async () => {
    const artist = await make('Aa')
    const exhibition = await prisma.exhibition.create({
      data: {
        slug: 'sea', title: 'Sea', city: 'Dubai', country: 'UAE', type: 'SOLO',
        startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01'),
        artists: { create: [{ artistId: artist.id, sortOrder: 0 }] },
      },
    })
    expect(exhibition.slug).toBe('sea')
    revalidateSite.mockClear()
    await client.patch(`/api/artists/${artist.id}/publish`, { isPublished: true })
    expect(postedTags()).toEqual(expect.arrayContaining(['artist:aa', 'exhibition:sea']))
    revalidateSite.mockClear()
    await client.patch(`/api/artists/${artist.id}`, { name: 'Zed' })
    expect(postedTags()).toEqual(expect.arrayContaining(['artist:aa', 'artist:zed', 'exhibition:sea']))
  })
})
