import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTING_DEFAULTS, SETTING_KEYS, tagsFor } from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const MISSING_ID = '00000000-0000-4000-8000-000000000000'

describe('settings', () => {
  let adminCookie: string
  let editorCookie: string
  const admin = authedClient(() => adminCookie)
  const editor = authedClient(() => editorCookie)
  const put = (client: typeof admin, key: string, value: unknown) => client.put(`/api/settings/${key}`, { value })
  const postedTags = () => vi.mocked(revalidateSite).mock.calls.flatMap(([tags]) => tags)

  async function makeMedia(key: string) {
    return prisma.media.create({
      data: { key, url: `https://m.test/${key}`, thumbUrl: `https://m.test/t-${key}`, width: 10, height: 10, mime: 'image/jpeg', bytes: 1, alt: key },
    })
  }

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    vi.mocked(revalidateSite).mockClear()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    await seedUser({ email: 'editor@example.test', role: 'EDITOR' })
    adminCookie = await loginAs('admin@example.test')
    editorCookie = await loginAs('editor@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('PUT heroLayout SPLIT then GET returns SPLIT and stores the row', async () => {
    expect((await put(admin, 'heroLayout', 'SPLIT')).status).toBe(200)
    const res = await admin.get('/api/settings/heroLayout')
    expect(res.status).toBe(200)
    expect(res.body.data).toBe('SPLIT')
    expect((await prisma.setting.findUnique({ where: { key: 'heroLayout' } }))?.value).toBe('SPLIT')
  })

  it('PUT heroLayout BANANA -> 400 VALIDATION and nothing stored', async () => {
    const res = await put(admin, 'heroLayout', 'BANANA')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(await prisma.setting.count()).toBe(0)
  })

  it('GET and PUT unknown key -> 404 NOT_FOUND', async () => {
    const get = await admin.get('/api/settings/nope')
    expect(get.status).toBe(404)
    expect(get.body.error.code).toBe('NOT_FOUND')
    const putRes = await put(admin, 'nope', 1)
    expect(putRes.status).toBe(404)
    expect(putRes.body.error.code).toBe('NOT_FOUND')
  })

  it('GET /settings returns all 11 keys with defaults when the table is empty', async () => {
    const res = await editor.get('/api/settings')
    expect(res.status).toBe(200)
    expect(Object.keys(res.body.data).sort()).toEqual([...SETTING_KEYS].sort())
    expect(res.body.data).toEqual(SETTING_DEFAULTS)
  })

  it('GET /settings/:key falls back to default and unauthenticated -> 401', async () => {
    const res = await admin.get('/api/settings/homeArtistCount')
    expect(res.status).toBe(200)
    expect(res.body.data).toBe(SETTING_DEFAULTS.homeArtistCount)
    expect((await call('GET', '/api/settings')).status).toBe(401)
  })

  it('EDITOR PUT -> 403 FORBIDDEN and nothing stored', async () => {
    const res = await put(editor, 'heroLayout', 'SPLIT')
    expect(res.status).toBe(403)
    expect(typeof res.body.error.code).toBe('string')
    expect(await prisma.setting.count()).toBe(0)
  })

  it('EDITOR may PUT about.* keys but still not other keys', async () => {
    const value = { ...(SETTING_DEFAULTS['about.gallery'] as object), statement: 'By an editor' }
    expect((await put(editor, 'about.gallery', value)).status).toBe(200)
    expect((await put(editor, 'footer', SETTING_DEFAULTS.footer)).status).toBe(403)
  })

  it('homeFocus.artistId must exist -> 400 UNKNOWN_ARTIST', async () => {
    const value = { ...(SETTING_DEFAULTS.homeFocus as object), artistId: MISSING_ID }
    const res = await put(admin, 'homeFocus', value)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('UNKNOWN_ARTIST')
    const artist = await prisma.artist.create({ data: { slug: 'aa', name: 'Aa', sortName: 'Aa' } })
    expect((await put(admin, 'homeFocus', { ...value, artistId: artist.id })).status).toBe(200)
  })

  it('homeFocus.imageId, about.*.imageId and site.ogImageId must exist -> 400 UNKNOWN_MEDIA', async () => {
    const cases: [string, object][] = [
      ['homeFocus', { ...(SETTING_DEFAULTS.homeFocus as object), imageId: MISSING_ID }],
      ['about.gallery', { ...(SETTING_DEFAULTS['about.gallery'] as object), imageId: MISSING_ID }],
      ['site', { ...(SETTING_DEFAULTS.site as object), ogImageId: MISSING_ID }],
    ]
    for (const [key, value] of cases) {
      const res = await put(admin, key, value)
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('UNKNOWN_MEDIA')
    }
    const media = await makeMedia('og')
    expect((await put(admin, 'site', { ...(SETTING_DEFAULTS.site as object), ogImageId: media.id })).status).toBe(200)
  })

  it('a video media id in site.ogImageId or homeFocus.imageId -> 400 INVALID_MEDIA_KIND', async () => {
    const video = await prisma.media.create({
      data: { key: 'v.mp4', url: 'https://m.test/v.mp4', thumbUrl: 'https://m.test/v.mp4', width: 0, height: 0, mime: 'video/mp4', kind: 'VIDEO', bytes: 1, alt: 'v' },
    })
    const cases: [string, object][] = [
      ['site', { ...(SETTING_DEFAULTS.site as object), ogImageId: video.id }],
      ['homeFocus', { ...(SETTING_DEFAULTS.homeFocus as object), imageId: video.id }],
    ]
    for (const [key, value] of cases) {
      const res = await put(admin, key, value)
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_MEDIA_KIND')
    }
  })

  it('homeHeroExhibitionId unknown -> 400 UNKNOWN_EXHIBITION; existing ok; null stored and read back', async () => {
    const bad = await put(admin, 'homeHeroExhibitionId', MISSING_ID)
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('UNKNOWN_EXHIBITION')
    const ex = await prisma.exhibition.create({
      data: { slug: 'x', title: 'X', city: 'C', country: 'K', type: 'SOLO', startDate: new Date('2026-12-01'), endDate: new Date('2027-01-01') },
    })
    expect((await put(admin, 'homeHeroExhibitionId', ex.id)).status).toBe(200)
    expect((await admin.get('/api/settings/homeHeroExhibitionId')).body.data).toBe(ex.id)
    expect((await put(admin, 'homeHeroExhibitionId', null)).status).toBe(200)
    expect((await admin.get('/api/settings/homeHeroExhibitionId')).body.data).toBeNull()
    expect(await prisma.setting.count()).toBe(1)
  })

  it('an invalid stored value falls back to its default without breaking other keys', async () => {
    await prisma.setting.create({ data: { key: 'heroLayout', value: 'BANANA' } })
    await prisma.setting.create({ data: { key: 'artistIndexLayout', value: 'FLOWING' } })
    const res = await admin.get('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.data.heroLayout).toBe('FULL_BLEED')
    expect(res.body.data.artistIndexLayout).toBe('FLOWING')
    expect((await admin.get('/api/settings/heroLayout')).body.data).toBe('FULL_BLEED')
  })

  it('a write triggers revalidation of the setting tag; failed writes do not', async () => {
    expect((await put(admin, 'heroLayout', 'BANANA')).status).toBe(400)
    expect(revalidateSite).not.toHaveBeenCalled()
    expect((await put(admin, 'heroLayout', 'SPLIT')).status).toBe(200)
    expect(postedTags()).toEqual(expect.arrayContaining(tagsFor('setting')))
  })
})
