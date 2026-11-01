import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { env } from '@/lib/server/env'
import { logError } from '@/lib/server/log'
import { R2Storage } from './r2.storage'
import { RangeNotSatisfiableError } from './storage.interface'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

describe('R2Storage', () => {
  const config = {
    endpoint: 'https://acct.r2.cloudflarestorage.com',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'arthouz-bucket',
    mediaUrlBase: '/media',
    urlTtlSeconds: 604800,
  }
  let send: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
  })
  afterEach(() => vi.restoreAllMocks())

  it('put sends PutObjectCommand with Bucket from config and returns the same-origin media url', async () => {
    const storage = new R2Storage(config)
    const result = await storage.put('arthouz/2026/10/a.jpg', Buffer.from('x'), 'image/jpeg')
    const command = send.mock.calls[0]![0] as PutObjectCommand
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toMatchObject({
      Bucket: 'arthouz-bucket',
      Key: 'arthouz/2026/10/a.jpg',
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    })
    expect(result).toEqual({ url: '/media/arthouz/2026/10/a.jpg' })
  })

  describe('publicUrlFor', () => {
    const KEY = 'arthouz/2026/10/a.jpg'
    afterEach(() => vi.useRealTimers())

    it('signs a GET url for the bucket and key with the configured lifetime, without any network call', async () => {
      const url = new URL(await new R2Storage(config).publicUrlFor(KEY))
      expect(url.hostname).toBe('arthouz-bucket.acct.r2.cloudflarestorage.com')
      expect(url.pathname).toBe(`/${KEY}`)
      expect(url.searchParams.get('X-Amz-Expires')).toBe('604800')
      expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy()
      expect(send).not.toHaveBeenCalled()
    })

    it('honours a custom lifetime', async () => {
      const url = new URL(await new R2Storage({ ...config, urlTtlSeconds: 3600 }).publicUrlFor(KEY))
      expect(url.searchParams.get('X-Amz-Expires')).toBe('3600')
    })

    it('signs at the start of the hour, so calls within the hour return the identical url', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-11-01T10:05:30Z'))
      const first = await new R2Storage(config).publicUrlFor(KEY)
      vi.setSystemTime(new Date('2026-11-01T10:59:59Z'))
      expect(await new R2Storage(config).publicUrlFor(KEY)).toBe(first)
      expect(new URL(first).searchParams.get('X-Amz-Date')).toBe('20261101T100000Z')
    })

    it('memoises per key and returns a different url in the next hour', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-11-01T10:05:00Z'))
      const storage = new R2Storage(config)
      const first = await storage.publicUrlFor(KEY)
      expect(await storage.publicUrlFor(KEY)).toBe(first)
      expect(await storage.publicUrlFor('arthouz/2026/10/b.jpg')).not.toBe(first)
      vi.setSystemTime(new Date('2026-11-01T11:00:01Z'))
      const next = await storage.publicUrlFor(KEY)
      expect(next).not.toBe(first)
      expect(new URL(next).searchParams.get('X-Amz-Date')).toBe('20261101T110000Z')
    })
  })

  it('delete sends DeleteObjectCommand', async () => {
    await new R2Storage(config).delete('k.jpg')
    const command = send.mock.calls[0]![0] as DeleteObjectCommand
    expect(command).toBeInstanceOf(DeleteObjectCommand)
    expect(command.input).toEqual({ Bucket: 'arthouz-bucket', Key: 'k.jpg' })
  })

  it('propagates storage errors and logs them', async () => {
    send.mockRejectedValue(new Error('boom'))
    await expect(new R2Storage(config).put('k', Buffer.from('x'), 'image/png')).rejects.toThrow('boom')
    await expect(new R2Storage(config).delete('k')).rejects.toThrow('boom')
    expect(logError).toHaveBeenCalledTimes(2)
  })

  describe('upload target', () => {
    it('presigns a 15 minute PUT with the content type signed and nothing sent to the network', async () => {
      const key = 'arthouz/2026/12345678-1234-1234-1234-123456789012.jpg'
      const before = Date.now()
      const target = await new R2Storage(config).createUploadTarget(key, 'image/jpeg', 1234)

      const url = new URL(target.url)
      expect(url.host).toBe('arthouz-bucket.acct.r2.cloudflarestorage.com')
      expect(url.pathname).toBe(`/${key}`)
      expect(url.searchParams.get('X-Amz-Expires')).toBe('900')
      expect(url.searchParams.get('X-Amz-SignedHeaders')?.split(';')).toEqual(['cache-control', 'content-length', 'content-type', 'host'])
      expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
      // A checksum of the (unknown) body in the URL would make R2 reject the real upload.
      expect([...url.searchParams.keys()].filter((name) => name.toLowerCase().includes('checksum') && name !== 'X-Amz-Content-Sha256')).toEqual([])
      expect(target.method).toBe('PUT')
      // content-length is signed but never returned: browsers set it themselves and refuse a manual one.
      expect(target.headers).toEqual({ 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' })
      expect(new Date(target.expiresAt).getTime()).toBeGreaterThanOrEqual(before + 900_000)
      expect(send).not.toHaveBeenCalled()
    })
  })

  describe('reading objects', () => {
    it('urlFor joins the media url base and key', () => {
      expect(new R2Storage(config).urlFor('a/b.jpg')).toBe('/media/a/b.jpg')
      expect(new R2Storage({ ...config, mediaUrlBase: 'https://cdn.example.test/' }).urlFor('a/b.jpg')).toBe('https://cdn.example.test/a/b.jpg')
    })

    it('head returns size, content type and etag', async () => {
      send.mockResolvedValue({ ContentLength: 42, ContentType: 'image/png', ETag: '"abc"' })
      await expect(new R2Storage(config).head('k.png')).resolves.toEqual({ bytes: 42, contentType: 'image/png', etag: '"abc"' })
      const command = send.mock.calls[0]![0] as HeadObjectCommand
      expect(command).toBeInstanceOf(HeadObjectCommand)
      expect(command.input).toEqual({ Bucket: 'arthouz-bucket', Key: 'k.png' })
    })

    it('head returns null for a missing object', async () => {
      send.mockRejectedValue(Object.assign(new Error('nope'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } }))
      await expect(new R2Storage(config).head('k.png')).resolves.toBeNull()
      expect(logError).not.toHaveBeenCalled()
    })

    it('head propagates and logs other failures', async () => {
      send.mockRejectedValue(new Error('denied'))
      await expect(new R2Storage(config).head('k.png')).rejects.toThrow('denied')
      expect(logError).toHaveBeenCalledTimes(1)
    })

    it('get returns the object body', async () => {
      send.mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } })
      await expect(new R2Storage(config).get('k.png')).resolves.toEqual(Buffer.from([1, 2, 3]))
      const command = send.mock.calls[0]![0] as GetObjectCommand
      expect(command).toBeInstanceOf(GetObjectCommand)
      expect(command.input).toEqual({ Bucket: 'arthouz-bucket', Key: 'k.png', Range: undefined })
    })

    it('getRange asks for an inclusive byte range', async () => {
      send.mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array([9]) } })
      await new R2Storage(config).getRange('k.mp4', 0, 65535)
      expect((send.mock.calls[0]![0] as GetObjectCommand).input.Range).toBe('bytes=0-65535')
    })

    describe('getStream', () => {
      const webStream = () => new ReadableStream<Uint8Array>()
      const bodyOf = (stream: ReadableStream<Uint8Array>) => ({ transformToWebStream: () => stream })

      it('streams the whole object with its type, length and etag', async () => {
        const stream = webStream()
        send.mockResolvedValue({ Body: bodyOf(stream), ContentType: 'image/png', ContentLength: 42, ETag: '"abc"' })
        const result = await new R2Storage(config).getStream('k.png')
        expect(result).toEqual({ body: stream, contentType: 'image/png', contentLength: 42, etag: '"abc"', range: undefined })
        const command = send.mock.calls[0]![0] as GetObjectCommand
        expect(command.input).toEqual({ Bucket: 'arthouz-bucket', Key: 'k.png', Range: undefined })
      })

      it('asks for a closed, open-ended and suffix range and reports the served one', async () => {
        send.mockResolvedValue({ Body: bodyOf(webStream()), ContentType: 'video/mp4', ContentLength: 11, ContentRange: 'bytes 10-20/100' })
        const storage = new R2Storage(config)
        const result = await storage.getStream('k.mp4', { start: 10, end: 20 })
        expect(result?.range).toEqual({ start: 10, end: 20, total: 100 })
        expect(result?.contentLength).toBe(11)
        await storage.getStream('k.mp4', { start: 10 })
        await storage.getStream('k.mp4', { suffix: 5 })
        expect(send.mock.calls.map(([command]) => (command as GetObjectCommand).input.Range)).toEqual(['bytes=10-20', 'bytes=10-', 'bytes=-5'])
      })

      it('is null for a missing object without logging', async () => {
        send.mockRejectedValue(Object.assign(new Error('nope'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } }))
        await expect(new R2Storage(config).getStream('k.png')).resolves.toBeNull()
        expect(logError).not.toHaveBeenCalled()
      })

      it('throws RangeNotSatisfiableError with the object size when the range is past the end', async () => {
        send.mockImplementation(async (command: unknown) => {
          if (command instanceof HeadObjectCommand) return { ContentLength: 100, ContentType: 'video/mp4' }
          throw Object.assign(new Error('bad range'), { name: 'InvalidRange', $metadata: { httpStatusCode: 416 } })
        })
        await expect(new R2Storage(config).getStream('k.mp4', { start: 500 })).rejects.toEqual(new RangeNotSatisfiableError(100))
        expect(logError).not.toHaveBeenCalled()
      })

      it('propagates and logs other failures and a missing body', async () => {
        send.mockRejectedValueOnce(new Error('denied'))
        await expect(new R2Storage(config).getStream('k.png')).rejects.toThrow('denied')
        send.mockResolvedValueOnce({})
        await expect(new R2Storage(config).getStream('k.png')).rejects.toThrow(/no body/i)
        expect(logError).toHaveBeenCalledTimes(2)
      })
    })

    it('get fails and logs when the response has no body', async () => {
      send.mockResolvedValue({})
      await expect(new R2Storage(config).get('k.png')).rejects.toThrow(/no body/i)
      expect(logError).toHaveBeenCalledTimes(1)
    })
  })

  it('fromEnv requires R2 settings', () => {
    expect(env.STORAGE_DRIVER).toBe('memory')
    expect(() => R2Storage.fromEnv({ ...env, AWS_S3_BUCKET_NAME: undefined })).toThrow(/AWS_S3_BUCKET_NAME/)
  })

  it('fromEnv builds a storage whose urls use MEDIA_URL_BASE and need no public bucket url', async () => {
    const source = {
      ...env,
      S3_ENDPOINT: config.endpoint,
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      AWS_S3_BUCKET_NAME: config.bucket,
    }
    await expect(R2Storage.fromEnv({ ...source, MEDIA_URL_BASE: '/media' }).put('a.jpg', Buffer.from('x'), 'image/jpeg')).resolves.toEqual({ url: '/media/a.jpg' })
    expect(R2Storage.fromEnv({ ...source, MEDIA_URL_BASE: 'https://cdn.example.test//' }).urlFor('a.jpg')).toBe('https://cdn.example.test/a.jpg')
  })
})
