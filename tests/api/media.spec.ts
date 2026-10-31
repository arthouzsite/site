import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTING_DEFAULTS } from '@/lib/shared'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { MAX_CONCURRENT_UPLOADS } from '@/lib/server/media/media.constants'
import { memoryStorage } from '@/lib/server/media/storage/storage.provider'
import { activeUploadCount } from '@/lib/server/media/upload-slots'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { authedClient, call, SESSION_COOKIE_NAME } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const MB = 1024 * 1024
const MISSING_ID = '00000000-0000-0000-0000-000000000000'

// ftyp box header of an MP4; the API stores videos as-is without decoding them.
const webm = () => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), randomBytes(2048)])
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), randomBytes(2048)])

describe('media', () => {
  let jpeg: Buffer
  let cookie: string
  let userId: string
  const client = authedClient(() => cookie)

  const upload = (bytes: Uint8Array, mime = 'image/jpeg', alt: string | null = 'A calm sea', filename = 'x.jpg') => {
    const form = new FormData()
    if (alt !== null) form.set('alt', alt)
    form.set('file', new File([bytes as BlobPart], filename, { type: mime }))
    return call('POST', '/api/media', { form, cookie: `${SESSION_COOKIE_NAME}=${cookie}` })
  }

  beforeAll(async () => {
    migrateTestDb()
    jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#3355aa' } }).jpeg().toBuffer()
  })
  beforeEach(async () => {
    vi.mocked(revalidateSite).mockClear()
    await resetDb()
    userId = (await seedUser({ email: 'editor@example.test', role: 'EDITOR' })).id
    cookie = await loginAs('editor@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('uploads a jpeg and returns media with url, thumbUrl, width, height, alt', async () => {
    const res = await upload(jpeg)
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toMatchObject({ width: 1600, height: 1200, alt: 'A calm sea', mime: 'image/jpeg', uploadedById: userId })
    expect(res.body.data.key).toMatch(/^arthouz\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/)
    expect(res.body.data.url).toBe(`memory://${res.body.data.key}`)
    expect(res.body.data.thumbUrl).toMatch(/-thumb\.webp$/)
  })

  it('rejects unauthenticated requests with 401', async () => {
    expect((await call('GET', '/api/media')).status).toBe(401)
  })

  it('rejects image/heic with 415', async () => {
    const res = await upload(jpeg, 'image/heic')
    expect(res.status).toBe(415)
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
    expect(await prisma.media.count()).toBe(0)
  })

  it('rejects 26 MB with 413', async () => {
    const res = await upload(randomBytes(26 * MB))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects an image one byte over 25 MB with 413 and stores nothing', async () => {
    // The size check runs before decoding, so a zero-filled body is enough to exercise the real route.
    const res = await upload(new Uint8Array(25 * MB + 1))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
    expect(await prisma.media.count()).toBe(0)
  })

  it('rejects a 26 MB image with 413 without touching storage', async () => {
    const before = memoryStorage.size
    const res = await upload(new Uint8Array(26 * MB))
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
    expect(memoryStorage.size).toBe(before)
    expect(await prisma.media.count()).toBe(0)
    expect(activeUploadCount()).toBe(0)
  })

  it('releases the concurrency slot after a rejected upload', async () => {
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS + 1; i += 1) {
      const rejected = await upload(Buffer.from('not an image'))
      expect(rejected.status).toBe(400)
      expect(activeUploadCount()).toBe(0)
    }
    const followUp = await upload(jpeg)
    expect(followUp.status).toBe(201)
    expect(activeUploadCount()).toBe(0)
  })

  it('rejects missing alt with 400 fields.alt', async () => {
    const res = await upload(jpeg, 'image/jpeg', null)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(res.body.error.fields.alt).toBeDefined()
    const blank = await upload(jpeg, 'image/jpeg', '   ')
    expect(blank.status).toBe(400)
    expect(blank.body.error.fields.alt).toBeDefined()
    expect(await prisma.media.count()).toBe(0)
  })

  it('rejects a missing file with 400 fields.file', async () => {
    const form = new FormData()
    form.set('alt', 'x')
    const res = await call('POST', '/api/media', { form, cookie: `${SESSION_COOKIE_NAME}=${cookie}` })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.file).toBe('File is required')
  })

  it('rejects a file field that is plain text with 400 fields.file', async () => {
    const form = new FormData()
    form.set('alt', 'x')
    form.set('file', 'just a string')
    const res = await call('POST', '/api/media', { form, cookie: `${SESSION_COOKIE_NAME}=${cookie}` })
    expect(res.status).toBe(400)
    expect(res.body.error.fields.file).toBe('File is required')
  })

  it('rejects a non-multipart body with 400 BAD_REQUEST', async () => {
    const res = await client.post('/api/media', { alt: 'x' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('BAD_REQUEST')
  })

  it('rejects a declared body size beyond the video limit with 413 before reading it', async () => {
    const res = await call('POST', '/api/media', {
      cookie: `${SESSION_COOKIE_NAME}=${cookie}`,
      headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(300 * MB) },
      body: undefined,
    })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects non-image bytes labelled as jpeg with 400 INVALID_IMAGE', async () => {
    const res = await upload(Buffer.from('not an image'), 'image/jpeg')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_IMAGE')
    expect(await prisma.media.count()).toBe(0)
  })

  it('lists with search, missingAlt and meta', async () => {
    await upload(jpeg, 'image/jpeg', 'Harbour at dawn')
    await upload(jpeg, 'image/jpeg', 'Mountain')
    const row = await prisma.media.findFirstOrThrow({ where: { alt: 'Mountain' } })
    await prisma.media.update({ where: { id: row.id }, data: { alt: '' } })

    const all = await client.get('/api/media')
    expect(all.status).toBe(200)
    expect(all.body.meta).toEqual({ total: 2, page: 1, limit: 50 })

    const q = await client.get('/api/media?q=harbour')
    expect(q.status).toBe(200)
    expect(q.body.data).toHaveLength(1)
    expect(q.body.meta.total).toBe(1)

    const missing = await client.get('/api/media?missingAlt=true')
    expect(missing.status).toBe(200)
    expect(missing.body.data.map((m: { id: string }) => m.id)).toEqual([row.id])

    const paged = await client.get('/api/media?limit=1&page=2')
    expect(paged.status).toBe(200)
    expect(paged.body.data).toHaveLength(1)
    expect(paged.body.meta).toEqual({ total: 2, page: 2, limit: 1 })
  })

  it('gets one with usedBy, patches alt and caption, 404s unknown', async () => {
    const created = (await upload(jpeg)).body.data
    const got = await client.get(`/api/media/${created.id}`)
    expect(got.status).toBe(200)
    expect(got.body.data.usedBy).toEqual([])
    const patched = await client.patch(`/api/media/${created.id}`, { alt: 'New alt', caption: 'Cap' })
    expect(patched.status).toBe(200)
    expect(patched.body.data).toMatchObject({ alt: 'New alt', caption: 'Cap' })
    expect((await client.patch(`/api/media/${created.id}`, { alt: '' })).status).toBe(400)
    expect((await client.get(`/api/media/${MISSING_ID}`)).status).toBe(404)
    expect((await client.patch(`/api/media/${MISSING_ID}`, { alt: 'x' })).status).toBe(404)
    expect((await client.del(`/api/media/${MISSING_ID}`)).status).toBe(404)
  })

  it('DELETE media referenced only by a setting -> 409 MEDIA_IN_USE naming the setting', async () => {
    const created = (await upload(jpeg)).body.data
    const cases: [string, Record<string, unknown>, string][] = [
      ['homeFocus', { artistId: null, imageId: created.id }, 'Home focus'],
      ['about.proprietor', { imageId: created.id }, 'About: proprietor'],
      ['site', { ogImageId: created.id }, 'Site social image'],
    ]
    for (const [key, partial, title] of cases) {
      const value = { ...(SETTING_DEFAULTS[key as keyof typeof SETTING_DEFAULTS] as object), ...partial } as Prisma.InputJsonObject
      await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
      const res = await client.del(`/api/media/${created.id}`)
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('MEDIA_IN_USE')
      expect(res.body.error.details.usedBy).toEqual([{ type: 'setting', id: key, title }])
      await prisma.setting.delete({ where: { key } })
    }
    const removed = await client.del(`/api/media/${created.id}`)
    expect(removed.status).toBe(200)
    expect(removed.body.data).toEqual({ id: created.id })
  })

  it('PATCH alt revalidates the pages that use the media', async () => {
    const created = (await upload(jpeg)).body.data
    await prisma.exhibition.create({
      data: {
        slug: 'sea', title: 'Sea', city: 'Dubai', country: 'UAE', type: 'SOLO',
        startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01'), heroImageId: created.id,
      },
    })
    vi.mocked(revalidateSite).mockClear()
    expect((await client.patch(`/api/media/${created.id}`, { alt: 'Fresh alt' })).status).toBe(200)
    const tags = vi.mocked(revalidateSite).mock.calls.flatMap(([batch]) => batch)
    expect(tags).toContain('exhibition:sea')
  })

  it('rejects an over-long q with 400 VALIDATION', async () => {
    expect((await client.get(`/api/media?q=${'a'.repeat(121)}`)).status).toBe(400)
    expect((await client.get(`/api/media?q=${'a'.repeat(120)}`)).status).toBe(200)
  })

  it('deletes unused media and its storage objects', async () => {
    const created = (await upload(jpeg)).body.data
    const thumbKey = created.key.replace(/\.jpg$/, '-thumb.webp')
    expect(memoryStorage.has(created.key)).toBe(true)
    expect(memoryStorage.has(thumbKey)).toBe(true)
    expect((await client.del(`/api/media/${created.id}`)).status).toBe(200)
    expect(await prisma.media.count()).toBe(0)
    expect(memoryStorage.has(created.key)).toBe(false)
    expect(memoryStorage.has(thumbKey)).toBe(false)
  })

  it('stores the detected mime, not the client-supplied one', async () => {
    const res = await upload(jpeg, 'image/png')
    expect(res.status).toBe(201)
    expect(res.body.data.mime).toBe('image/jpeg')
  })

  it('DELETE used media -> 409 MEDIA_IN_USE listing the exhibition title', async () => {
    const created = (await upload(jpeg)).body.data
    const exhibition = await prisma.exhibition.create({
      data: {
        slug: 'sea',
        title: 'Sea Change',
        city: 'Dubai',
        country: 'UAE',
        type: 'SOLO',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-02-01'),
        heroImageId: created.id,
      },
    })
    const res = await client.del(`/api/media/${created.id}`)
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('MEDIA_IN_USE')
    expect(res.body.error.details.usedBy).toEqual([{ type: 'exhibition', id: exhibition.id, title: 'Sea Change' }])
    const got = await client.get(`/api/media/${created.id}`)
    expect(got.status).toBe(200)
    expect(got.body.data.usedBy).toHaveLength(1)
    expect(await prisma.media.count()).toBe(1)
  })

  describe('video uploads', () => {
    it('uploads an mp4 as kind VIDEO with zero dimensions and thumbUrl = url', async () => {
      const res = await upload(mp4(), 'video/mp4', 'Studio tour', 'tour.mp4')
      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({ kind: 'VIDEO', mime: 'video/mp4', width: 0, height: 0, alt: 'Studio tour', uploadedById: userId })
      expect(res.body.data.key).toMatch(/^arthouz\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.mp4$/)
      expect(res.body.data.thumbUrl).toBe(res.body.data.url)
      expect(memoryStorage.has(res.body.data.key)).toBe(true)
      expect(memoryStorage.has(res.body.data.key.replace(/\.mp4$/, '-thumb.webp'))).toBe(false)
    })

    it('accepts webm and quicktime', async () => {
      const webmRes = await upload(webm(), 'video/webm', 'w', 'a.webm')
      const mov = await upload(mp4(), 'video/quicktime', 'm', 'a.mov')
      expect(webmRes.status).toBe(201)
      expect(mov.status).toBe(201)
      expect(webmRes.body.data.key).toMatch(/\.webm$/)
      expect(mov.body.data.key).toMatch(/\.mov$/)
    })

    it('rejects bytes without a video signature with 400 INVALID_VIDEO and stores nothing', async () => {
      const fake = await upload(Buffer.from('definitely not a video'), 'video/mp4', 'fake', 'f.mp4')
      expect(fake.status).toBe(400)
      expect(fake.body.error.code).toBe('INVALID_VIDEO')
      const swapped = await upload(mp4(), 'video/webm', 'swapped', 'f.webm')
      expect(swapped.status).toBe(400)
      expect(swapped.body.error.code).toBe('INVALID_VIDEO')
      expect(await prisma.media.count()).toBe(0)
    })

    it('rejects video/x-msvideo with 415', async () => {
      const res = await upload(mp4(), 'video/x-msvideo', 'avi', 'a.avi')
      expect(res.status).toBe(415)
      expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
      expect(await prisma.media.count()).toBe(0)
    })

    it('marks images as kind IMAGE', async () => {
      const res = await upload(jpeg)
      expect(res.body.data.kind).toBe('IMAGE')
    })

    it('filters the list by kind and rejects unknown kinds with 400 VALIDATION', async () => {
      await upload(jpeg, 'image/jpeg', 'Still')
      const video = (await upload(mp4(), 'video/mp4', 'Film', 'f.mp4')).body.data

      const videos = await client.get('/api/media?kind=video')
      expect(videos.status).toBe(200)
      expect(videos.body.data.map((m: { id: string }) => m.id)).toEqual([video.id])
      expect(videos.body.meta.total).toBe(1)

      const images = await client.get('/api/media?kind=image')
      expect(images.body.data).toHaveLength(1)
      expect(images.body.data[0].kind).toBe('IMAGE')

      expect((await client.get('/api/media')).body.meta.total).toBe(2)

      const bad = await client.get('/api/media?kind=bogus')
      expect(bad.status).toBe(400)
      expect(bad.body.error.code).toBe('VALIDATION')
      expect(bad.body.error.fields.kind).toBeDefined()
    })

    it('deletes a video and its single storage object', async () => {
      const created = (await upload(mp4(), 'video/mp4', 'Film', 'f.mp4')).body.data
      expect((await client.del(`/api/media/${created.id}`)).status).toBe(200)
      expect(await prisma.media.count()).toBe(0)
      expect(memoryStorage.has(created.key)).toBe(false)
    })
  })
})
