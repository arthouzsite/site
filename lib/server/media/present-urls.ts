import { getStorage } from './storage/storage.provider'
import { isServableKey } from './media-keys'

const STORED_MEDIA_URL = /^\/media\/(arthouz\/.+)$/

/** The object key a stored `/media/<key>` URL points at, or null for any other string (including already-signed URLs). */
function storedKey(value: string): string | null {
  const key = STORED_MEDIA_URL.exec(value)?.[1]
  return key && isServableKey(key) ? key : null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const prototype = Object.getPrototypeOf(value) as unknown
  return prototype === Object.prototype || prototype === null
}

async function present(value: unknown, sign: (key: string) => Promise<string>): Promise<unknown> {
  if (typeof value === 'string') {
    const key = storedKey(value)
    return key ? sign(key) : value
  }
  if (Array.isArray(value)) return Promise.all(value.map((item) => present(item, sign)))
  if (!isPlainObject(value)) return value
  const entries = await Promise.all(Object.entries(value).map(async ([name, item]) => [name, await present(item, sign)] as const))
  return Object.fromEntries(entries)
}

/**
 * Returns a copy of `value` in which every stored media URL (`/media/arthouz/...`) is the storage driver's public URL
 * (a presigned bucket URL for R2). Stored data is untouched; other strings, numbers, dates and other non-plain objects
 * pass through. Idempotent: a signed URL no longer starts with `/media/`.
 */
export async function presentMediaUrls<T>(value: T): Promise<T> {
  const storage = getStorage()
  return (await present(value, (key) => storage.publicUrlFor(key))) as T
}
