import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { SETTING_DEFAULTS, SETTING_KEYS, tagsFor } from '@arthouz/shared'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const MISSING_ID = '00000000-0000-4000-8000-000000000000'

describe('settings', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminCookie: string
  let editorCookie: string
  let fetchMock: jest.Mock
  const realFetch = globalThis.fetch
  const http = () => request(app.getHttpServer())
  const as = (cookie: string) => ({
    get: (p: string) => http().get(p).set('Cookie', cookie),
    put: (p: string) => http().put(p).set('Cookie', cookie),
  })
  const postedTags = () =>
    fetchMock.mock.calls.flatMap(([, init]) => (JSON.parse((init as RequestInit).body as string) as { tags: string[] }).tags)

  async function makeMedia(key: string) {
    return prisma.media.create({
      data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/t-${key}`, width: 10, height: 10, mime: 'image/jpeg', bytes: 1, alt: key },
    })
  }

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb()
    resetThrottle(app)
    await seedUser(app, { email: 'admin@example.test', role: 'ADMIN' })
    await seedUser(app, { email: 'editor@example.test', role: 'EDITOR' })
    adminCookie = await loginAs(app, 'admin@example.test')
    editorCookie = await loginAs(app, 'editor@example.test')
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

  it('PUT heroLayout SPLIT then GET returns SPLIT and stores the row', async () => {
    await as(adminCookie).put('/settings/heroLayout').send({ value: 'SPLIT' }).expect(200)
    const res = await as(adminCookie).get('/settings/heroLayout').expect(200)
    expect(res.body.data).toBe('SPLIT')
    expect((await prisma.setting.findUnique({ where: { key: 'heroLayout' } }))?.value).toBe('SPLIT')
  })

  it('PUT heroLayout BANANA -> 400 VALIDATION and nothing stored', async () => {
    const res = await as(adminCookie).put('/settings/heroLayout').send({ value: 'BANANA' }).expect(400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(await prisma.setting.count()).toBe(0)
  })

  it('GET and PUT unknown key -> 404 NOT_FOUND', async () => {
    const get = await as(adminCookie).get('/settings/nope').expect(404)
    expect(get.body.error.code).toBe('NOT_FOUND')
    const put = await as(adminCookie).put('/settings/nope').send({ value: 1 }).expect(404)
    expect(put.body.error.code).toBe('NOT_FOUND')
  })

  it('GET /settings returns all 11 keys with defaults when the table is empty', async () => {
    const res = await as(editorCookie).get('/settings').expect(200)
    expect(Object.keys(res.body.data).sort()).toEqual([...SETTING_KEYS].sort())
    expect(res.body.data).toEqual(SETTING_DEFAULTS)
  })

  it('GET /settings/:key falls back to default and unauthenticated -> 401', async () => {
    const res = await as(adminCookie).get('/settings/homeArtistCount').expect(200)
    expect(res.body.data).toBe(SETTING_DEFAULTS.homeArtistCount)
    await http().get('/settings').expect(401)
  })

  it('EDITOR PUT -> 403 FORBIDDEN and nothing stored', async () => {
    const res = await as(editorCookie).put('/settings/heroLayout').send({ value: 'SPLIT' }).expect(403)
    expect(typeof res.body.error.code).toBe('string')
    expect(await prisma.setting.count()).toBe(0)
  })

  it('EDITOR may PUT about.* keys but still not other keys', async () => {
    const value = { ...(SETTING_DEFAULTS['about.gallery'] as object), statement: 'By an editor' }
    await as(editorCookie).put('/settings/about.gallery').send({ value }).expect(200)
    await as(editorCookie).put('/settings/footer').send({ value: SETTING_DEFAULTS.footer }).expect(403)
  })

  it('homeFocus.artistId must exist -> 400 UNKNOWN_ARTIST', async () => {
    const value = { ...(SETTING_DEFAULTS.homeFocus as object), artistId: MISSING_ID }
    const res = await as(adminCookie).put('/settings/homeFocus').send({ value }).expect(400)
    expect(res.body.error.code).toBe('UNKNOWN_ARTIST')
    const artist = await prisma.artist.create({ data: { slug: 'aa', name: 'Aa', sortName: 'Aa' } })
    await as(adminCookie).put('/settings/homeFocus').send({ value: { ...value, artistId: artist.id } }).expect(200)
  })

  it('homeFocus.imageId, about.*.imageId and site.ogImageId must exist -> 400 UNKNOWN_MEDIA', async () => {
    const cases: [string, object][] = [
      ['homeFocus', { ...(SETTING_DEFAULTS.homeFocus as object), imageId: MISSING_ID }],
      ['about.gallery', { ...(SETTING_DEFAULTS['about.gallery'] as object), imageId: MISSING_ID }],
      ['site', { ...(SETTING_DEFAULTS.site as object), ogImageId: MISSING_ID }],
    ]
    for (const [key, value] of cases) {
      const res = await as(adminCookie).put(`/settings/${key}`).send({ value }).expect(400)
      expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
    }
    const media = await makeMedia('og')
    await as(adminCookie).put('/settings/site').send({ value: { ...(SETTING_DEFAULTS.site as object), ogImageId: media.id } }).expect(200)
  })

  it('homeHeroExhibitionId unknown -> 400 UNKNOWN_EXHIBITION; existing ok; null stored and read back', async () => {
    const bad = await as(adminCookie).put('/settings/homeHeroExhibitionId').send({ value: MISSING_ID }).expect(400)
    expect(bad.body.error.code).toBe('UNKNOWN_EXHIBITION')
    const ex = await prisma.exhibition.create({
      data: { slug: 'x', title: 'X', city: 'C', country: 'K', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-01') },
    })
    await as(adminCookie).put('/settings/homeHeroExhibitionId').send({ value: ex.id }).expect(200)
    expect((await as(adminCookie).get('/settings/homeHeroExhibitionId')).body.data).toBe(ex.id)
    await as(adminCookie).put('/settings/homeHeroExhibitionId').send({ value: null }).expect(200)
    expect((await as(adminCookie).get('/settings/homeHeroExhibitionId')).body.data).toBeNull()
    expect(await prisma.setting.count()).toBe(1)
  })

  it('an invalid stored value falls back to its default without breaking other keys', async () => {
    await prisma.setting.create({ data: { key: 'heroLayout', value: 'BANANA' } })
    await prisma.setting.create({ data: { key: 'artistIndexLayout', value: 'FLOWING' } })
    const res = await as(adminCookie).get('/settings').expect(200)
    expect(res.body.data.heroLayout).toBe('FULL_BLEED')
    expect(res.body.data.artistIndexLayout).toBe('FLOWING')
    expect((await as(adminCookie).get('/settings/heroLayout').expect(200)).body.data).toBe('FULL_BLEED')
  })

  it('a write triggers revalidation of the setting tag; failed writes do not', async () => {
    await as(adminCookie).put('/settings/heroLayout').send({ value: 'BANANA' }).expect(400)
    expect(fetchMock).not.toHaveBeenCalled()
    await as(adminCookie).put('/settings/heroLayout').send({ value: 'SPLIT' }).expect(200)
    expect(postedTags()).toEqual(expect.arrayContaining(tagsFor('setting')))
  })
})
