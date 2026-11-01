import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Env } from '@/lib/server/env'
import { logError } from '@/lib/server/log'
import { CACHE_CONTROL, UPLOAD_URL_TTL_SECONDS } from '../media.constants'
import { mediaUrlFor } from '../media-keys'
import type { RangeRequest } from '../media-range'
import { RangeNotSatisfiableError, type Storage, type StoredObjectInfo, type StoredStream, type UploadTarget } from './storage.interface'

const HTTP_NOT_FOUND = 404
const HTTP_RANGE_NOT_SATISFIABLE = 416
const CONTENT_RANGE_PATTERN = /^bytes (\d+)-(\d+)\/(\d+)$/
const MS_PER_SECOND = 1000
const MS_PER_HOUR = 3_600_000
const MAX_MEMOISED_URLS = 5000
const SIGNED_UPLOAD_HEADERS = new Set(['content-type', 'cache-control', 'content-length'])

function isUnsatisfiableRange(error: unknown): boolean {
  const { name, $metadata } = (error ?? {}) as { name?: string; $metadata?: { httpStatusCode?: number } }
  return name === 'InvalidRange' || $metadata?.httpStatusCode === HTTP_RANGE_NOT_SATISFIABLE
}

function rangeHeader(range: RangeRequest): string {
  if ('suffix' in range) return `bytes=-${range.suffix}`
  return `bytes=${range.start}-${range.end ?? ''}`
}

function servedRange(contentRange: string | undefined): StoredStream['range'] {
  const match = contentRange ? CONTENT_RANGE_PATTERN.exec(contentRange) : null
  return match ? { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) } : undefined
}

function isMissingObject(error: unknown): boolean {
  const { name, $metadata } = (error ?? {}) as { name?: string; $metadata?: { httpStatusCode?: number } }
  return name === 'NotFound' || name === 'NoSuchKey' || $metadata?.httpStatusCode === HTTP_NOT_FOUND
}

export type R2Config = {
  endpoint: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  /** Prefix of the URLs recorded for objects: `/media` (served by this app) or an absolute CDN origin. */
  mediaUrlBase: string
  /** How long a signed read URL stays valid, counted from the start of the hour it was signed in. */
  urlTtlSeconds: number
}

export class R2Storage implements Storage {
  private readonly client: S3Client
  private signedUrls = new Map<string, string>()
  private signedHour = -1

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
    const { S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, MEDIA_URL_BASE, MEDIA_URL_TTL_SECONDS } = source
    if (!S3_ENDPOINT || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET_NAME) {
      throw new Error(
        'R2 storage requires S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME',
      )
    }
    return new R2Storage({
      endpoint: S3_ENDPOINT,
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      bucket: AWS_S3_BUCKET_NAME,
      mediaUrlBase: MEDIA_URL_BASE,
      urlTtlSeconds: MEDIA_URL_TTL_SECONDS,
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
    return mediaUrlFor(this.config.mediaUrlBase, key)
  }

  /**
   * A presigned GET URL for the private object. Signed at the start of the current hour, so every call within the
   * hour returns the identical string (browser and CDN caches hit); the URL stays valid for `urlTtlSeconds` from then.
   */
  async publicUrlFor(key: string): Promise<string> {
    const hour = Math.floor(Date.now() / MS_PER_HOUR)
    if (hour !== this.signedHour) {
      this.signedUrls = new Map()
      this.signedHour = hour
    }
    const known = this.signedUrls.get(key)
    if (known) return known
    const url = await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucket, Key: key }), {
      expiresIn: this.config.urlTtlSeconds,
      signingDate: new Date(hour * MS_PER_HOUR),
    })
    if (this.signedUrls.size >= MAX_MEMOISED_URLS) this.signedUrls = new Map()
    this.signedUrls.set(key, url)
    return url
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }))
    } catch (error) {
      logError(`R2 delete failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
  }

  /**
   * A presigned PUT URL with content type, cache control and the declared length signed: a PUT with other bytes
   * is refused by R2. Browsers send Content-Length themselves, so only content-type and cache-control are returned
   * for the client to forward.
   */
  async createUploadTarget(key: string, contentType: string, bytes: number): Promise<UploadTarget> {
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: contentType, CacheControl: CACHE_CONTROL, ContentLength: bytes }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS, signableHeaders: SIGNED_UPLOAD_HEADERS },
    )
    return {
      url,
      method: 'PUT',
      headers: { 'content-type': contentType, 'cache-control': CACHE_CONTROL },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * MS_PER_SECOND).toISOString(),
    }
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }))
      return { bytes: result.ContentLength ?? 0, contentType: result.ContentType ?? '', etag: result.ETag }
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

  async getStream(key: string, range?: RangeRequest): Promise<StoredStream | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.bucket, Key: key, Range: range ? rangeHeader(range) : undefined }),
      )
      if (!result.Body) throw new Error(`R2 returned no body for ${key}`)
      return {
        body: result.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: result.ContentType ?? 'application/octet-stream',
        contentLength: result.ContentLength,
        etag: result.ETag,
        range: servedRange(result.ContentRange),
      }
    } catch (error) {
      if (isMissingObject(error)) return null
      if (isUnsatisfiableRange(error)) throw new RangeNotSatisfiableError((await this.head(key))?.bytes)
      logError(`R2 stream failed for ${key}`, error instanceof Error ? error.stack : String(error))
      throw error
    }
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
