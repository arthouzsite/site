import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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
