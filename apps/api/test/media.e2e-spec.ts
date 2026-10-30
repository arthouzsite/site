import type { INestApplication } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import request from 'supertest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { MemoryStorage } from '../src/media/storage/memory.storage'
import { STORAGE } from '../src/media/storage/storage.interface'
import { createTestApp } from './helpers/app'
import { loginAs, seedUser } from './helpers/users'
import { migrateTestDb, resetDb } from './helpers/db'

const MB = 1024 * 1024

describe('media', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let jpeg: Buffer
  let cookie: string
  let userId: string

  const server = () => app.getHttpServer()
  const http = {
    get: (path: string) => request(server()).get(path).set('Cookie', cookie),
    post: (path: string) => request(server()).post(path).set('Cookie', cookie),
    patch: (path: string) => request(server()).patch(path).set('Cookie', cookie),
    delete: (path: string) => request(server()).delete(path).set('Cookie', cookie),
  }
  const upload = (buf: Buffer, mime = 'image/jpeg', alt: string | null = 'A calm sea', filename = 'x.jpg') => {
    const req = http.post('/media')
    if (alt !== null) req.field('alt', alt)
    return req.attach('file', buf, { filename, contentType: mime })
  }
  // ftyp box header of an MP4; the API stores videos as-is without decoding them.
  const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), randomBytes(2048)])

  beforeAll(async () => {
    migrateTestDb()
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST as string }),
    })
    jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#3355aa' } }).jpeg().toBuffer()
  })
  beforeEach(async () => {
    await resetDb()
    app = await createTestApp()
    userId = (await seedUser(app, { email: 'editor@example.test', role: 'EDITOR' })).id
    cookie = await loginAs(app, 'editor@example.test')
  })
  afterEach(async () => app.close())
  afterAll(async () => prisma.$disconnect())

  it('uploads a jpeg and returns media with url, thumbUrl, width, height, alt', async () => {
    const res = await upload(jpeg).expect(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.data).toMatchObject({
      width: 1600,
      height: 1200,
      alt: 'A calm sea',
      mime: 'image/jpeg',
      uploadedById: userId,
    })
    expect(res.body.data.key).toMatch(/^arthouz\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/)
    expect(res.body.data.url).toBe(`memory://${res.body.data.key}`)
    expect(res.body.data.thumbUrl).toMatch(/-thumb\.webp$/)
  })

  it('rejects unauthenticated requests with 401', async () => {
    await request(server()).get('/media').expect(401)
  })

  it('rejects image/heic with 415', async () => {
    const res = await upload(jpeg, 'image/heic').expect(415)
    expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
    expect(await prisma.media.count()).toBe(0)
  })

  it('rejects 26 MB with 413', async () => {
    const res = await upload(randomBytes(26 * MB)).expect(413)
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE')
  })

  it('rejects missing alt with 400 fields.alt', async () => {
    const res = await upload(jpeg, 'image/jpeg', null).expect(400)
    expect(res.body.error.code).toBe('VALIDATION')
    expect(res.body.error.fields.alt).toBeDefined()
    const blank = await upload(jpeg, 'image/jpeg', '   ').expect(400)
    expect(blank.body.error.fields.alt).toBeDefined()
    expect(await prisma.media.count()).toBe(0)
  })

  it('rejects a missing file with 400 fields.file', async () => {
    const res = await http.post('/media').field('alt', 'x').expect(400)
    expect(res.body.error.fields.file).toBeDefined()
  })

  it('rejects non-image bytes labelled as jpeg with 400 INVALID_IMAGE', async () => {
    const res = await upload(Buffer.from('not an image'), 'image/jpeg').expect(400)
    expect(res.body.error.code).toBe('INVALID_IMAGE')
    expect(await prisma.media.count()).toBe(0)
  })

  it('lists with search, missingAlt and meta', async () => {
    await upload(jpeg, 'image/jpeg', 'Harbour at dawn').expect(201)
    await upload(jpeg, 'image/jpeg', 'Mountain').expect(201)
    const row = await prisma.media.findFirstOrThrow({ where: { alt: 'Mountain' } })
    await prisma.media.update({ where: { id: row.id }, data: { alt: '' } })

    const all = await http.get('/media').expect(200)
    expect(all.body.meta).toEqual({ total: 2, page: 1, limit: 50 })

    const q = await http.get('/media?q=harbour').expect(200)
    expect(q.body.data).toHaveLength(1)
    expect(q.body.meta.total).toBe(1)

    const missing = await http.get('/media?missingAlt=true').expect(200)
    expect(missing.body.data.map((m: { id: string }) => m.id)).toEqual([row.id])

    const paged = await http.get('/media?limit=1&page=2').expect(200)
    expect(paged.body.data).toHaveLength(1)
    expect(paged.body.meta).toEqual({ total: 2, page: 2, limit: 1 })
  })

  it('gets one with usedBy, patches alt and caption, 404s unknown', async () => {
    const created = (await upload(jpeg).expect(201)).body.data
    const got = await http.get(`/media/${created.id}`).expect(200)
    expect(got.body.data.usedBy).toEqual([])
    const patched = await http.patch(`/media/${created.id}`)
      .send({ alt: 'New alt', caption: 'Cap' })
      .expect(200)
    expect(patched.body.data).toMatchObject({ alt: 'New alt', caption: 'Cap' })
    await http.patch(`/media/${created.id}`).send({ alt: '' }).expect(400)
    await http.get('/media/00000000-0000-0000-0000-000000000000').expect(404)
    await http.delete('/media/00000000-0000-0000-0000-000000000000').expect(404)
  })

  it('deletes unused media and its storage objects', async () => {
    const storage = app.get<MemoryStorage>(STORAGE)
    const created = (await upload(jpeg).expect(201)).body.data
    const thumbKey = created.key.replace(/\.jpg$/, '-thumb.webp')
    expect(storage.has(created.key)).toBe(true)
    expect(storage.has(thumbKey)).toBe(true)
    await http.delete(`/media/${created.id}`).expect(200)
    expect(await prisma.media.count()).toBe(0)
    expect(storage.has(created.key)).toBe(false)
    expect(storage.has(thumbKey)).toBe(false)
  })

  it('stores the detected mime, not the client-supplied one', async () => {
    const res = await upload(jpeg, 'image/png').expect(201)
    expect(res.body.data.mime).toBe('image/jpeg')
  })

  it('DELETE used media → 409 MEDIA_IN_USE listing the exhibition title', async () => {
    const created = (await upload(jpeg).expect(201)).body.data
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
    const res = await http.delete(`/media/${created.id}`).expect(409)
    expect(res.body.error.code).toBe('MEDIA_IN_USE')
    expect(res.body.error.details.usedBy).toEqual([
      { type: 'exhibition', id: exhibition.id, title: 'Sea Change' },
    ])
    const got = await http.get(`/media/${created.id}`).expect(200)
    expect(got.body.data.usedBy).toHaveLength(1)
    expect(await prisma.media.count()).toBe(1)
  })

  describe('video uploads', () => {
    it('uploads an mp4 as kind VIDEO with zero dimensions and thumbUrl = url', async () => {
      const storage = app.get<MemoryStorage>(STORAGE)
      const res = await upload(mp4(), 'video/mp4', 'Studio tour', 'tour.mp4').expect(201)
      expect(res.body.data).toMatchObject({ kind: 'VIDEO', mime: 'video/mp4', width: 0, height: 0, alt: 'Studio tour', uploadedById: userId })
      expect(res.body.data.key).toMatch(/^arthouz\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.mp4$/)
      expect(res.body.data.thumbUrl).toBe(res.body.data.url)
      expect(storage.has(res.body.data.key)).toBe(true)
      expect(storage.has(res.body.data.key.replace(/\.mp4$/, '-thumb.webp'))).toBe(false)
    })

    it('accepts webm and quicktime', async () => {
      const webm = await upload(mp4(), 'video/webm', 'w', 'a.webm').expect(201)
      const mov = await upload(mp4(), 'video/quicktime', 'm', 'a.mov').expect(201)
      expect(webm.body.data.key).toMatch(/\.webm$/)
      expect(mov.body.data.key).toMatch(/\.mov$/)
    })

    it('rejects video/x-msvideo with 415', async () => {
      const res = await upload(mp4(), 'video/x-msvideo', 'avi', 'a.avi').expect(415)
      expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE')
      expect(await prisma.media.count()).toBe(0)
    })

    it('marks images as kind IMAGE', async () => {
      const res = await upload(jpeg).expect(201)
      expect(res.body.data.kind).toBe('IMAGE')
    })

    it('filters the list by kind and rejects unknown kinds with 400 VALIDATION', async () => {
      await upload(jpeg, 'image/jpeg', 'Still').expect(201)
      const video = (await upload(mp4(), 'video/mp4', 'Film', 'f.mp4').expect(201)).body.data

      const videos = await http.get('/media?kind=video').expect(200)
      expect(videos.body.data.map((m: { id: string }) => m.id)).toEqual([video.id])
      expect(videos.body.meta.total).toBe(1)

      const images = await http.get('/media?kind=image').expect(200)
      expect(images.body.data).toHaveLength(1)
      expect(images.body.data[0].kind).toBe('IMAGE')

      expect((await http.get('/media').expect(200)).body.meta.total).toBe(2)

      const bad = await http.get('/media?kind=bogus').expect(400)
      expect(bad.body.error.code).toBe('VALIDATION')
      expect(bad.body.error.fields.kind).toBeDefined()
    })

    it('deletes a video and its single storage object', async () => {
      const storage = app.get<MemoryStorage>(STORAGE)
      const created = (await upload(mp4(), 'video/mp4', 'Film', 'f.mp4').expect(201)).body.data
      await http.delete(`/media/${created.id}`).expect(200)
      expect(await prisma.media.count()).toBe(0)
      expect(storage.has(created.key)).toBe(false)
    })
  })
})
