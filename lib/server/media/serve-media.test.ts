import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logError } from '@/lib/server/log'
import { serveMedia } from './serve-media'
import { MemoryStorage } from './storage/memory.storage'
import { RangeNotSatisfiableError, type Storage } from './storage/storage.interface'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

const KEY = 'arthouz/2026/11/abcdef12-1234-4abc-9def-123456789abc.mp4'
const SEGMENTS = KEY.split('/')
const BYTES = Buffer.from('0123456789')
const IMMUTABLE = 'public, max-age=31536000, s-maxage=31536000, immutable'

const request = (method = 'GET', headers: Record<string, string> = {}) => new Request(`http://localhost/media/${KEY}`, { method, headers })

describe('serveMedia', () => {
  let storage: MemoryStorage

  beforeEach(async () => {
    vi.clearAllMocks()
    storage = new MemoryStorage()
    await storage.put(KEY, BYTES, 'video/mp4')
  })

  it('streams the object with every header set', async () => {
    const res = await serveMedia(request(), SEGMENTS, storage)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer())).toEqual(BYTES)
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-length')).toBe('10')
    expect(res.headers.get('cache-control')).toBe(IMMUTABLE)
    expect(res.headers.get('accept-ranges')).toBe('bytes')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-range')).toBeNull()
  })

  it('passes the etag through when storage provides one', async () => {
    const stub: Storage = { ...storage, getStream: async () => ({ body: new Response('x').body!, contentType: 'image/png', contentLength: 1, etag: '"abc"' }) } as unknown as Storage
    const res = await serveMedia(request(), SEGMENTS, stub)
    expect(res.headers.get('etag')).toBe('"abc"')
  })

  it('answers 206 with Content-Range for a byte range', async () => {
    const res = await serveMedia(request('GET', { range: 'bytes=2-4' }), SEGMENTS, storage)
    expect(res.status).toBe(206)
    expect(await res.text()).toBe('234')
    expect(res.headers.get('content-range')).toBe('bytes 2-4/10')
    expect(res.headers.get('content-length')).toBe('3')
    expect(res.headers.get('cache-control')).toBe(IMMUTABLE)
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('supports open-ended and suffix ranges', async () => {
    expect(await (await serveMedia(request('GET', { range: 'bytes=7-' }), SEGMENTS, storage)).text()).toBe('789')
    expect(await (await serveMedia(request('GET', { range: 'bytes=-2' }), SEGMENTS, storage)).text()).toBe('89')
  })

  it('serves the whole object for a malformed range', async () => {
    const res = await serveMedia(request('GET', { range: 'bytes=abc' }), SEGMENTS, storage)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('0123456789')
  })

  it('answers 416 uncached with the object size for an unsatisfiable range', async () => {
    const res = await serveMedia(request('GET', { range: 'bytes=50-60' }), SEGMENTS, storage)
    expect(res.status).toBe(416)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-range')).toBe('bytes */10')
  })

  it('omits Content-Range on a 416 when the size is unknown', async () => {
    const stub = { getStream: async () => { throw new RangeNotSatisfiableError() } } as unknown as Storage
    const res = await serveMedia(request('GET', { range: 'bytes=50-60' }), SEGMENTS, stub)
    expect(res.status).toBe(416)
    expect(res.headers.get('content-range')).toBeNull()
  })

  it('answers 404 with no-store for a missing object', async () => {
    const res = await serveMedia(request(), ['arthouz', '2026', '11', 'abcdef12-1234-4abc-9def-123456789abd.mp4'], storage)
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('content-range')).toBeNull()
  })

  it('answers HEAD with the headers and no body', async () => {
    const res = await serveMedia(request('HEAD'), SEGMENTS, storage)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('')
    expect(res.headers.get('content-type')).toBe('video/mp4')
    expect(res.headers.get('content-length')).toBe('10')
    expect(res.headers.get('cache-control')).toBe(IMMUTABLE)
    expect(res.headers.get('accept-ranges')).toBe('bytes')
  })

  it('answers HEAD for a missing object with 404', async () => {
    const res = await serveMedia(request('HEAD'), ['arthouz', '2026', 'abcdef12-1234-4abc-9def-123456789abd.mp4'], storage)
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('answers 404 and never touches storage for keys that are not servable', async () => {
    const spy: Storage = {
      head: vi.fn(),
      getStream: vi.fn(),
    } as unknown as Storage
    for (const segments of [['..', 'etc', 'passwd'], ['arthouz', '..', 'secret.jpg'], ['arthouz', 'seed', 'a.svg'], ['arthouz', '', 'x.jpg'], [], ['arthouz', 'seed', 'A.JPG']]) {
      for (const method of ['GET', 'HEAD']) {
        const res = await serveMedia(request(method), segments, spy)
        expect(res.status).toBe(404)
        expect(res.headers.get('cache-control')).toBe('no-store')
      }
    }
    expect(spy.head).not.toHaveBeenCalled()
    expect(spy.getStream).not.toHaveBeenCalled()
  })

  it('logs and answers an uncached 500 when storage fails', async () => {
    const failing = { getStream: async () => { throw new Error('r2 down') }, head: async () => { throw new Error('r2 down') } } as unknown as Storage
    for (const method of ['GET', 'HEAD']) {
      const res = await serveMedia(request(method), SEGMENTS, failing)
      expect(res.status).toBe(500)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
    expect(logError).toHaveBeenCalledTimes(2)
  })
})
