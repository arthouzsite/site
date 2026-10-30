import { Logger } from '@nestjs/common'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from '../../config/env'
import { R2Storage } from './r2.storage'

describe('R2Storage', () => {
  const config = {
    endpoint: 'https://acct.r2.cloudflarestorage.com',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    bucket: 'arthouz-bucket',
    publicUrl: 'https://cdn.example.test',
  }
  let send: jest.SpyInstance

  beforeEach(() => {
    send = jest.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
  })
  afterEach(() => jest.restoreAllMocks())

  it('put sends PutObjectCommand with Bucket from config and returns public url', async () => {
    const storage = new R2Storage(config)
    const result = await storage.put('arthouz/2026/10/a.jpg', Buffer.from('x'), 'image/jpeg')
    const command = send.mock.calls[0][0] as PutObjectCommand
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
    const command = send.mock.calls[0][0] as DeleteObjectCommand
    expect(command).toBeInstanceOf(DeleteObjectCommand)
    expect(command.input).toEqual({ Bucket: 'arthouz-bucket', Key: 'k.jpg' })
  })

  it('propagates storage errors', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation()
    send.mockRejectedValue(new Error('boom'))
    await expect(new R2Storage(config).put('k', Buffer.from('x'), 'image/png')).rejects.toThrow('boom')
    await expect(new R2Storage(config).delete('k')).rejects.toThrow('boom')
    expect(logged).toHaveBeenCalledTimes(2)
  })

  it('fromEnv requires R2 settings', () => {
    expect(env.STORAGE_DRIVER).toBe('memory')
    expect(() => R2Storage.fromEnv({ ...env, AWS_S3_BUCKET_NAME: undefined })).toThrow(/AWS_S3_BUCKET_NAME/)
  })
})
