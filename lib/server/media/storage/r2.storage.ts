import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env } from '@/lib/server/env'
import { logError } from '@/lib/server/log'
import { CACHE_CONTROL, UPLOAD_URL_TTL_SECONDS } from '../media.constants'
import type { Storage, StoredObjectInfo, UploadTarget } from './storage.interface'

const HTTP_NOT_FOUND = 404
const MS_PER_SECOND = 1000

function isMissingObject(error: unknown): boolean {
  const { name, $metadata } = (error ?? {}) as { name?: string; $metadata?: { httpStatusCode?: number } }
  return name === 'NotFound' || name === 'NoSuchKey' || $metadata?.httpStatusCode === HTTP_NOT_FOUND
}

export type R2Config = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl: string
}

export class R2Storage implements Storage {
  private readonly client: S3Client

  constructor(private readonly config: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      // The SDK's default CRC32 checksum of an empty body would be baked into a presigned PUT URL and fail every upload.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
  }

  static fromEnv(source: Env): R2Storage {
    const { S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_S3_PUBLIC_URL } = source
    if (!S3_ENDPOINT || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET_NAME || !AWS_S3_PUBLIC_URL) {
      throw new Error(
        'R2 storage requires S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_S3_PUBLIC_URL',
      )
    }
    return new R2Storage({
      endpoint: S3_ENDPOINT,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      bucket: AWS_S3_BUCKET_NAME,
      publicUrl: AWS_S3_PUBLIC_URL.replace(/\/+$/, ''),
    })
  }

  async put(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    try {
      await this.client.send(
        new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: CACHE_CONTROL }),
      )
    } catch (error) {
      logError(`R2 put failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
    return { url: this.urlFor(key) }
  }

  urlFor(key: string): string {
    return `${this.config.publicUrl}/${key}`
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }))
    } catch (error) {
      logError(`R2 delete failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
  }

  /** A presigned PUT URL with the content type signed, so the browser must send exactly the declared type. */
  async createUploadTarget(key: string, contentType: string): Promise<UploadTarget> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: contentType }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: new Set(['content-type']) },
    )
    return {
      url,
      method: 'PUT',
      headers: { 'content-type': contentType },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * MS_PER_SECOND).toISOString(),
    }
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }))
      return { bytes: result.ContentLength ?? 0, contentType: result.ContentType ?? '' }
    } catch (error) {
      if (isMissingObject(error)) return null
      logError(`R2 head failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
  }

  get(key: string): Promise<Buffer> {
    return this.read(key)
  }

  getRange(key: string, start: number, endInclusive: number): Promise<Buffer> {
    return this.read(key, `bytes=${start}-${endInclusive}`)
  }

  private async read(key: string, range?: string): Promise<Buffer> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key, Range: range }))
      if (!result.Body) throw new Error(`R2 returned no body for ${key}`)
      return Buffer.from(await result.Body.transformToByteArray())
    } catch (error) {
      logError(`R2 get failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
  }
}
