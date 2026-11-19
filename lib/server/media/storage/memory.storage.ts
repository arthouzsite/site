import { CACHE_CONTROL, UPLOAD_URL_TTL_SECONDS } from '../media.constants'
import { mediaUrlFor } from '../media-keys'
import { resolveRange, type RangeRequest } from '../media-range'
import { RangeNotSatisfiableError, type Storage, type StoredObjectInfo, type StoredStream, type UploadTarget } from './storage.interface'

const LOCAL_UPLOAD_PATH = '/api/media/uploads/'
const MS_PER_SECOND = 1000
const DEFAULT_MEDIA_URL_BASE = '/media'

export class MemoryStorage implements Storage {
  private readonly objects = new Map<string, { body: Buffer; contentType: string }>()
  private readonly declaredBytes = new Map<string, number>()

  constructor(private readonly mediaUrlBase: string = DEFAULT_MEDIA_URL_BASE) {}

  async put(key: string, body: Buffer, contentType: string): Promise<{ url: string }> {
    this.objects.set(key, { body, contentType })
    return { url: this.urlFor(key) }
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key)
  }

  urlFor(key: string): string {
    return mediaUrlFor(this.mediaUrlBase, key)
  }

  /** The target is the same-origin PUT route, which stores the bytes in this map. */
  async createUploadTarget(key: string, contentType: string, bytes: number): Promise<UploadTarget> {
    this.declaredBytes.set(key, bytes)
    return {
      url: `${LOCAL_UPLOAD_PATH}${key}`,
      method: 'PUT',
      headers: { 'content-type': contentType, 'cache-control': CACHE_CONTROL },
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * MS_PER_SECOND).toISOString(),
    }
  }

  async head(key: string): Promise<StoredObjectInfo | null> {
    const object = this.objects.get(key)
    return object ? { bytes: object.body.length, contentType: object.contentType } : null
  }

  async get(key: string): Promise<Buffer> {
    return this.read(key)
  }

  async getRange(key: string, start: number, endInclusive: number): Promise<Buffer> {
    return this.read(key).subarray(start, endInclusive + 1)
  }

  async getStream(key: string, range?: RangeRequest): Promise<StoredStream | null> {
    const object = this.objects.get(key)
    if (!object) return null
    const total = object.body.length
    const resolved = range ? resolveRange(range, total) : undefined
    if (range && !resolved) throw new RangeNotSatisfiableError(total)
    const bytes = resolved ? object.body.subarray(resolved.start, resolved.end + 1) : object.body
    return { body: new Response(new Uint8Array(bytes)).body!, contentType: object.contentType, contentLength: bytes.length, range: resolved ?? undefined }
  }

  private read(key: string): Buffer {
    const object = this.objects.get(key)
    if (!object) throw new Error(`No object stored under ${key}`)
    return object.body
  }

  /** The size declared when the upload target for `key` was created; the local PUT route holds the body to it. */
  declaredSize(key: string): number | undefined {
    return this.declaredBytes.get(key)
  }

  has(key: string): boolean {
    return this.objects.has(key)
  }

  /** Number of stored objects; lets tests prove an upload never reached storage. */
  get size(): number {
    return this.objects.size
  }
}
