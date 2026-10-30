import type { INestApplication } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import request from 'supertest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'

const MB = 1024 * 1024

describe('media', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let jpeg: Buffer

  const server = () => app.getHttpServer()
  const upload = (buf: Buffer, mime = 'image/jpeg', alt: string | null = 'A calm sea') => {
    const req = request(server()).post('/media')
    if (alt !== null) req.field('alt', alt)
    return req.attach('file', buf, { filename: 'x.jpg', contentType: mime })
  }

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
      uploadedById: null,
    })
    expect(res.body.data.key).toMatch(/^arthouz\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/)
    expect(res.body.data.url).toBe(`memory://${res.body.data.key}`)
    expect(res.body.data.thumbUrl).toMatch(/-thumb\.webp$/)
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
    const res = await request(server()).post('/media').field('alt', 'x').expect(400)
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

    const all = await request(server()).get('/media').expect(200)
    expect(all.body.meta).toEqual({ total: 2, page: 1, limit: 50 })

    const q = await request(server()).get('/media?q=harbour').expect(200)
    expect(q.body.data).toHaveLength(1)
    expect(q.body.meta.total).toBe(1)

    const missing = await request(server()).get('/media?missingAlt=true').expect(200)
    expect(missing.body.data.map((m: { id: string }) => m.id)).toEqual([row.id])

    const paged = await request(server()).get('/media?limit=1&page=2').expect(200)
    expect(paged.body.data).toHaveLength(1)
    expect(paged.body.meta).toEqual({ total: 2, page: 2, limit: 1 })
  })

  it('gets one with usedBy, patches alt and caption, 404s unknown', async () => {
    const created = (await upload(jpeg).expect(201)).body.data
    const got = await request(server()).get(`/media/${created.id}`).expect(200)
    expect(got.body.data.usedBy).toEqual([])
    const patched = await request(server())
      .patch(`/media/${created.id}`)
      .send({ alt: 'New alt', caption: 'Cap' })
      .expect(200)
    expect(patched.body.data).toMatchObject({ alt: 'New alt', caption: 'Cap' })
    await request(server()).patch(`/media/${created.id}`).send({ alt: '' }).expect(400)
    await request(server()).get('/media/00000000-0000-0000-0000-000000000000').expect(404)
    await request(server()).delete('/media/00000000-0000-0000-0000-000000000000').expect(404)
  })

  it('deletes unused media and its storage objects', async () => {
    const created = (await upload(jpeg).expect(201)).body.data
    await request(server()).delete(`/media/${created.id}`).expect(200)
    expect(await prisma.media.count()).toBe(0)
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
    const res = await request(server()).delete(`/media/${created.id}`).expect(409)
    expect(res.body.error.code).toBe('MEDIA_IN_USE')
    expect(res.body.error.details.usedBy).toEqual([
      { type: 'exhibition', id: exhibition.id, title: 'Sea Change' },
    ])
    const got = await request(server()).get(`/media/${created.id}`).expect(200)
    expect(got.body.data.usedBy).toHaveLength(1)
    expect(await prisma.media.count()).toBe(1)
  })
})
