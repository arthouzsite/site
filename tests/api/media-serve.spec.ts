import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, HEAD } from '@/app/media/[...key]/route'
import { memoryStorage } from '@/lib/server/media/storage/storage.provider'
import { prisma } from '@/lib/server/prisma'
import { call, SESSION_COOKIE_NAME } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

const IMMUTABLE = 'public, max-age=31536000, s-maxage=31536000, immutable'
const mp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), randomBytes(2048)])

type Target = { key: string; url: string; headers: Record<string, string> }

// The harness `call()` only resolves app/api, so the public media route is invoked the way Next does.
const serve = (handler: typeof GET, path: string, headers: Record<string, string> = {}, method = 'GET') =>
  handler(new Request(`http://localhost/media/${path}`, { method, headers }), { params: Promise.resolve({ key: path.split('/') }) })

describe('GET /media/[...key]', () => {
  let jpeg: Buffer
  let cookie: string
  const auth = () => `${SESSION_COOKIE_NAME}=${cookie}`

  // The full presigned flow: create target, PUT bytes, complete; returns the recorded row.
  async function uploadThroughApi(bytes: Buffer, mime: string) {
    const created = await call('POST', '/api/media/uploads', { body: { filename: 'f', mime, bytes: bytes.length, alt: 'A calm sea' }, cookie: auth() })
    const target = created.body.data as Target
    await call('PUT', target.url, { raw: bytes as BodyInit, headers: target.headers, cookie: auth() })
    const done = await call('POST', '/api/media/uploads/complete', { body: { key: target.key, alt: 'A calm sea' }, cookie: auth() })
    expect(done.status).toBe(201)
    return done.body.data as { key: string; url: string; thumbUrl: string }
  }

  beforeAll(async () => {
    migrateTestDb()
    jpeg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#3355aa' } }).jpeg().toBuffer()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'editor@example.test', role: 'EDITOR' })
    cookie = await loginAs('editor@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('serves an uploaded image and its thumbnail from the recorded same-origin urls', async () => {
    const media = await uploadThroughApi(jpeg, 'image/jpeg')
    expect(media.url).toBe(`/media/${media.key}`)

    const original = await serve(GET, media.url.replace(/^\/media\//, ''))
    expect(original.status).toBe(200)
    expect(Buffer.from(await original.arrayBuffer())).toEqual(jpeg)
    expect(original.headers.get('content-type')).toBe('image/jpeg')
    expect(original.headers.get('content-length')).toBe(String(jpeg.length))
    expect(original.headers.get('cache-control')).toBe(IMMUTABLE)
    expect(original.headers.get('accept-ranges')).toBe('bytes')

    const thumb = await serve(GET, media.thumbUrl.replace(/^\/media\//, ''))
    expect(thumb.status).toBe(200)
    expect(thumb.headers.get('content-type')).toBe('image/webp')
    expect(thumb.headers.get('cache-control')).toBe(IMMUTABLE)
    expect((await sharp(Buffer.from(await thumb.arrayBuffer())).metadata()).format).toBe('webp')
  })

  it('answers HEAD without a body and honours a Range on an uploaded video', async () => {
    const video = mp4()
    const media = await uploadThroughApi(video, 'video/mp4')
    const path = media.key

    const head = await serve(HEAD, path, {}, 'HEAD')
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe(String(video.length))
    expect(await head.text()).toBe('')

    const part = await serve(GET, path, { range: 'bytes=4-11' })
    expect(part.status).toBe(206)
    expect(part.headers.get('content-range')).toBe(`bytes 4-11/${video.length}`)
    expect(part.headers.get('content-length')).toBe('8')
    expect(Buffer.from(await part.arrayBuffer())).toEqual(video.subarray(4, 12))

    const past = await serve(GET, path, { range: `bytes=${video.length}-` })
    expect(past.status).toBe(416)
    expect(past.headers.get('content-range')).toBe(`bytes */${video.length}`)
    expect(past.headers.get('cache-control')).toBe('no-store')
  })

  it('answers 404 with no-store for a well-formed key nothing is stored under', async () => {
    const res = await serve(GET, 'arthouz/2026/abcdef12-1234-4abc-9def-123456789abc.jpg')
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('answers 404 for an unknown or traversing key without touching storage', async () => {
    const head = vi.spyOn(memoryStorage, 'head')
    const getStream = vi.spyOn(memoryStorage, 'getStream')
    for (const path of ['../etc/passwd', 'arthouz/../.env', 'arthouz/seed/a.svg', 'arthouz//2026/x.jpg', 'arthouz/seed/%2e%2e/a.jpg', 'secret.txt']) {
      for (const [handler, method] of [[GET, 'GET'], [HEAD, 'HEAD']] as const) {
        const res = await serve(handler, path, {}, method)
        expect(res.status).toBe(404)
        expect(res.headers.get('cache-control')).toBe('no-store')
      }
    }
    expect(head).not.toHaveBeenCalled()
    expect(getStream).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
