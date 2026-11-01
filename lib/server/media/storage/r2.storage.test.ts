import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { env } from '@/lib/server/env'
import { logError } from '@/lib/server/log'
import { R2Storage } from './r2.storage'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

describe('R2Storage', () => {
  const config = {
    endpoint: 'https://acct.r2.cloudflarestorage.com',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'arthouz-bucket',
    publicUrl: 'https://cdn.example.test',
  }
  let send: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
  })
  afterEach(() => vi.restoreAllMocks())

  it('put sends PutObjectCommand with Bucket from config and returns public url', async () => {
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
    expect(result).toEqual({ url: 'https://cdn.example.test/arthouz/2026/10/a.jpg' })
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
    it('urlFor joins the public url and key', () => {
      expect(new R2Storage(config).urlFor('a/b.jpg')).toBe('https://cdn.example.test/a/b.jpg')
    })

    it('head returns size and content type', async () => {
      send.mockResolvedValue({ ContentLength: 42, ContentType: 'image/png' })
      await expect(new R2Storage(config).head('k.png')).resolves.toEqual({ bytes: 42, contentType: 'image/png' })
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

  it('fromEnv builds a storage whose public url has no trailing slash', async () => {
    const storage = R2Storage.fromEnv({
      ...env,
      S3_ENDPOINT: config.endpoint,
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      AWS_S3_BUCKET_NAME: config.bucket,
      AWS_S3_PUBLIC_URL: `${config.publicUrl}//`,
    })
    await expect(storage.put('a.jpg', Buffer.from('x'), 'image/jpeg')).resolves.toEqual({ url: 'https://cdn.example.test/a.jpg' })
  })
})
