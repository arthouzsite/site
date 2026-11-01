import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryStorage } from '@/lib/server/media/storage/storage.provider'
import { activeUploadCount } from '@/lib/server/media/upload-slots'
import { prisma } from '@/lib/server/prisma'
import { call, SESSION_COOKIE_NAME } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const MB = 1024 * 1024
const KEY_PATTERN = /^arthouz\/\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp|avif|mp4|webm|mov)$/
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), randomBytes(2048)])

type Target = { key: string; method: string; url: string; headers: Record<string, string>; expiresAt: string }

describe('presigned media uploads', () => {
  let jpeg: Buffer
  let png: Buffer
  let cookie: string
  let userId: string
  const auth = () => `${SESSION_COOKIE_NAME}=${cookie}`

  const createTarget = (body: unknown, withCookie = true) =>
    call('POST', '/api/media/uploads', { body, cookie: withCookie ? auth() : undefined })
  const putBytes = (target: Target, bytes: Uint8Array) =>
    call('PUT', target.url, { raw: bytes as BodyInit, headers: target.headers, cookie: auth() })
  const complete = (body: unknown, withCookie = true) =>
    call('POST', '/api/media/uploads/complete', { body, cookie: withCookie ? auth() : undefined })

  // Steps 1 and 2: returns the allocated target after the bytes are stored.
  async function stage(bytes: Buffer, mime: string, declared = bytes.length): Promise<Target> {
    const created = await createTarget({ filename: 'f', mime, bytes: declared, alt: 'A calm sea' })
    expect(created.status).toBe(201)
    const target = created.body.data as Target
    expect((await putBytes(target, bytes)).status).toBe(200)
    return target
  }

  beforeAll(async () => {
    migrateTestDb()
    jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#3355aa' } }).jpeg().toBuffer()
    png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#aa5533' } }).png().toBuffer()
  })
  beforeEach(async () => {
    await resetDb()
    userId = (await seedUser({ email: 'editor@example.test', role: 'EDITOR' })).id
    cookie = await loginAs('editor@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('step 1: create target', () => {
    it('returns the key, a same-origin PUT url, the signed headers and an expiry', async () => {
      const res = await createTarget({ filename: 'sea.jpg', mime: 'image/jpeg', bytes: jpeg.length, alt: 'A calm sea' })
      expect(res.status).toBe(201)
      expect(res.body.ok).toBe(true)
      const target = res.body.data as Target
      expect(Object.keys(target).sort()).toEqual(['expiresAt', 'headers', 'key', 'method', 'url'])
      expect(target.key).toMatch(KEY_PATTERN)
      expect(target.key.endsWith('.jpg')).toBe(true)
      expect(target.method).toBe('PUT')
      expect(target.url).toBe(`/api/media/uploads/${target.key}`)
      expect(target.headers).toEqual({ 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' })
      expect(new Date(target.expiresAt).getTime()).toBeGreaterThan(Date.now())
    })

    it.each([
      ['image/heic', 1000, 415, 'UNSUPPORTED_MEDIA_TYPE'],
      ['image/jpeg', 25 * MB + 1, 413, 'PAYLOAD_TOO_LARGE'],
      ['video/mp4', 200 * MB + 1, 413, 'PAYLOAD_TOO_LARGE'],
    ])('rejects mime %s with %i bytes as %i', async (mime, bytes, status, code) => {
      const res = await createTarget({ filename: 'f', mime, bytes, alt: 'x' })
      expect(res.status).toBe(status)
      expect(res.body.error.code).toBe(code)
    })

    it('accepts a video larger than the image limit', async () => {
      const res = await createTarget({ filename: 'f.mp4', mime: 'video/mp4', bytes: 100 * MB, alt: 'x' })
      expect(res.status).toBe(201)
      expect(res.body.data.key).toMatch(/\.mp4$/)
    })

    it.each([
      [{ filename: 'f', mime: 'image/jpeg', bytes: 10 }, 'alt'],
      [{ filename: 'f', mime: 'image/jpeg', bytes: 10, alt: '  ' }, 'alt'],
      [{ filename: 'f', mime: 'image/jpeg', bytes: 0, alt: 'x' }, 'bytes'],
      [{ filename: 'f', mime: 'image/jpeg', bytes: 1.5, alt: 'x' }, 'bytes'],
      [{ mime: 'image/jpeg', bytes: 10, alt: 'x' }, 'filename'],
    ])('rejects an invalid body with 400 VALIDATION on %j', async (body, field) => {
      const res = await createTarget(body)
      expect(res.status).toBe(400)
      expect(res.body.error.fields).toHaveProperty(field)
    })
  })

  describe('full flow', () => {
    it('records an image: the target key becomes the row key and the thumbnail is stored next to it', async () => {
      const target = await stage(jpeg, 'image/jpeg')
      expect(memoryStorage.has(target.key)).toBe(true)

      const res = await complete({ key: target.key, alt: 'A calm sea' })
      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({
        key: target.key,
        url: `/media/${target.key}`,
        width: 1600,
        height: 1200,
        mime: 'image/jpeg',
        kind: 'IMAGE',
        bytes: jpeg.length,
        alt: 'A calm sea',
        uploadedById: userId,
      })
      const thumbKey = target.key.replace(/\.jpg$/, '-thumb.webp')
      expect(res.body.data.thumbUrl).toBe(`/media/${thumbKey}`)
      expect(memoryStorage.has(thumbKey)).toBe(true)
      expect(await prisma.media.count()).toBe(1)
      expect(activeUploadCount()).toBe(0)
    })

    it('records a video from its signature alone, with thumbUrl equal to url', async () => {
      const target = await stage(mp4(), 'video/mp4')
      const res = await complete({ key: target.key, alt: 'A short film' })
      expect(res.status).toBe(201)
      expect(res.body.data).toMatchObject({
        key: target.key,
        url: `/media/${target.key}`,
        thumbUrl: `/media/${target.key}`,
        width: 0,
        height: 0,
        mime: 'video/mp4',
        kind: 'VIDEO',
        alt: 'A short film',
      })
    })

    it('the recorded media is listed and deletable like any other', async () => {
      const target = await stage(png, 'image/png')
      const id = (await complete({ key: target.key, alt: 'p' })).body.data.id
      const listed = await call('GET', '/api/media', { cookie: auth() })
      expect(listed.body.data.map((m: { id: string }) => m.id)).toEqual([id])
      expect((await call('DELETE', `/api/media/${id}`, { cookie: auth() })).status).toBe(200)
      expect(memoryStorage.has(target.key)).toBe(false)
    })

    it('rejects completing the same key twice with 409 UPLOAD_ALREADY_COMPLETED', async () => {
      const target = await stage(png, 'image/png')
      expect((await complete({ key: target.key, alt: 'a' })).status).toBe(201)
      const again = await complete({ key: target.key, alt: 'a' })
      expect(again.status).toBe(409)
      expect(again.body.error.code).toBe('UPLOAD_ALREADY_COMPLETED')
      expect(await prisma.media.count()).toBe(1)
      expect(memoryStorage.has(target.key)).toBe(true)
    })
  })

  describe('step 3 guards', () => {
    it('400 UPLOAD_NOT_FOUND when nothing was uploaded under the key', async () => {
      const created = await createTarget({ filename: 'f', mime: 'image/png', bytes: 10, alt: 'x' })
      const res = await complete({ key: created.body.data.key, alt: 'x' })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('UPLOAD_NOT_FOUND')
    })

    it.each(['uploads/x.png', 'arthouz/2026/../../etc/passwd.png', 'arthouz/2026/not-a-uuid.png', 'arthouz/2026/12345678-1234-1234-1234-123456789012.exe'])(
      'rejects the malformed key %s with 400 before touching storage',
      async (key) => {
        const res = await complete({ key, alt: 'x' })
        expect(res.status).toBe(400)
        expect(res.body.error.fields).toHaveProperty('key')
      },
    )

    it('rejects a missing alt with 400 VALIDATION and keeps the object', async () => {
      const target = await stage(png, 'image/png')
      const res = await complete({ key: target.key })
      expect(res.status).toBe(400)
      expect(res.body.error.fields).toHaveProperty('alt')
      expect(memoryStorage.has(target.key)).toBe(true)
    })

    it('413 and deletes the object when the stored size exceeds the image limit', async () => {
      const key = 'arthouz/2026/12345678-1234-1234-1234-123456789012.jpg'
      await memoryStorage.put(key, Buffer.alloc(25 * MB + 1), 'image/jpeg')
      const res = await complete({ key, alt: 'x' })
      expect(res.status).toBe(413)
      expect(memoryStorage.has(key)).toBe(false)
      expect(await prisma.media.count()).toBe(0)
    })

    it.each([
      ['image/png', 'png'],
      ['video/mp4', 'mp4'],
    ])('400 EMPTY_UPLOAD and deletes a zero-byte %s object', async (mime, ext) => {
      const key = `arthouz/2026/12345678-1234-1234-1234-123456789012.${ext}`
      await memoryStorage.put(key, Buffer.alloc(0), mime)
      const res = await complete({ key, alt: 'x' })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('EMPTY_UPLOAD')
      expect(memoryStorage.has(key)).toBe(false)
      expect(await prisma.media.count()).toBe(0)
    })

    it('415 and deletes the object when the stored content type is not allowed', async () => {
      const key = 'arthouz/2026/12345678-1234-1234-1234-123456789012.png'
      await memoryStorage.put(key, png, 'text/html')
      const res = await complete({ key, alt: 'x' })
      expect(res.status).toBe(415)
      expect(memoryStorage.has(key)).toBe(false)
    })

    it('415 and deletes the object when the stored type does not match the key extension', async () => {
      const key = 'arthouz/2026/12345678-1234-1234-1234-123456789012.png'
      await memoryStorage.put(key, png, 'image/jpeg')
      const res = await complete({ key, alt: 'x' })
      expect(res.status).toBe(415)
      expect(memoryStorage.has(key)).toBe(false)
    })

    it('400 INVALID_IMAGE and deletes the object when sharp cannot decode it', async () => {
      const target = await stage(randomBytes(512), 'image/jpeg')
      const res = await complete({ key: target.key, alt: 'x' })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_IMAGE')
      expect(memoryStorage.has(target.key)).toBe(false)
      expect(await prisma.media.count()).toBe(0)
      expect(activeUploadCount()).toBe(0)
    })

    it('400 INVALID_VIDEO and deletes the object when the signature is wrong', async () => {
      const target = await stage(randomBytes(2048), 'video/mp4')
      const res = await complete({ key: target.key, alt: 'x' })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INVALID_VIDEO')
      expect(memoryStorage.has(target.key)).toBe(false)
    })
  })

  describe('local PUT (memory driver)', () => {
    it('400 UPLOAD_SIZE_MISMATCH and stores nothing when the body length differs from the declared bytes', async () => {
      const created = await createTarget({ filename: 'f', mime: 'image/png', bytes: png.length, alt: 'x' })
      const target = created.body.data as Target
      const longer = await putBytes(target, Buffer.concat([png, Buffer.from([0])]))
      expect(longer.status).toBe(400)
      expect(longer.body.error.code).toBe('UPLOAD_SIZE_MISMATCH')
      expect((await putBytes(target, png.subarray(1))).status).toBe(400)
      expect(memoryStorage.has(target.key)).toBe(false)
    })

    it('409 UPLOAD_ALREADY_COMPLETED when a completed key is PUT again, keeping the original bytes', async () => {
      const target = await stage(png, 'image/png')
      expect((await complete({ key: target.key, alt: 'a' })).status).toBe(201)
      const again = await putBytes(target, Buffer.from(png))
      expect(again.status).toBe(409)
      expect(again.body.error.code).toBe('UPLOAD_ALREADY_COMPLETED')
    })

    it('400 UPLOAD_NOT_ALLOCATED for a well-formed key no target was created for', async () => {
      const res = await call('PUT', '/api/media/uploads/arthouz/2026/12345678-1234-1234-1234-123456789012.png', {
        raw: png as BodyInit,
        headers: { 'content-type': 'image/png' },
        cookie: auth(),
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('UPLOAD_NOT_ALLOCATED')
    })

    it('413 when the body exceeds the bound, storing nothing', async () => {
      const created = await createTarget({ filename: 'f', mime: 'image/png', bytes: 10, alt: 'x' })
      const target = created.body.data as Target
      const res = await call('PUT', target.url, {
        raw: new Uint8Array(201 * MB + 1),
        headers: target.headers,
        cookie: auth(),
      })
      expect(res.status).toBe(413)
      expect(memoryStorage.has(target.key)).toBe(false)
    })

    it('415 and stores nothing when the content type does not match the key extension', async () => {
      const created = await createTarget({ filename: 'f', mime: 'image/png', bytes: 10, alt: 'x' })
      const target = created.body.data as Target
      const res = await call('PUT', target.url, { raw: png as BodyInit, headers: { 'content-type': 'video/mp4' }, cookie: auth() })
      expect(res.status).toBe(415)
      expect(memoryStorage.has(target.key)).toBe(false)
    })

    it('400 for a key outside the allocated shape', async () => {
      const res = await call('PUT', '/api/media/uploads/arthouz/2026/evil.png', { raw: png as BodyInit, cookie: auth() })
      expect(res.status).toBe(400)
    })
  })

  describe('authentication', () => {
    it('401 on all three endpoints without a session', async () => {
      expect((await createTarget({ filename: 'f', mime: 'image/png', bytes: 1, alt: 'x' }, false)).status).toBe(401)
      expect((await complete({ key: 'arthouz/2026/12345678-1234-1234-1234-123456789012.png', alt: 'x' }, false)).status).toBe(401)
      const put = await call('PUT', '/api/media/uploads/arthouz/2026/12345678-1234-1234-1234-123456789012.png', { raw: png as BodyInit })
      expect(put.status).toBe(401)
    })
  })
})
