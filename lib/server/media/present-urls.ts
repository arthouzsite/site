import { getStorage } from './storage/storage.provider'
import { isServableKey } from './media-keys'

const STORED_MEDIA_URL = /^\/media\/(arthouz\/.+)$/

/** The object key a legacy `/media/<key>` URL points at, or null for any other string (including CDN URLs). */
function storedKey(value: string): string | null {
  const key = STORED_MEDIA_URL.exec(value)?.[1]
  return key && isServableKey(key) ? key : null
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const prototype = Object.getPrototypeOf(value) as unknown
  return prototype === Object.prototype || prototype === null
}

function present(value: unknown, urlFor: (key: string) => string): unknown {
  if (typeof value === 'string') {
    const key = storedKey(value)
    return key ? urlFor(key) : value
  }
  if (Array.isArray(value)) return value.map((item) => present(item, urlFor))
  if (!isPlainObject(value)) return value
  return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, present(item, urlFor)]))
}

/**
 * Returns a copy of `value` in which every legacy media URL (`/media/arthouz/...`, recorded before the public CDN)
 * is the storage driver's URL for that key (`${MEDIA_URL_BASE}/<key>`). Rows already holding CDN URLs, other strings,
 * numbers, dates and other non-plain objects pass through. Stored data is untouched.
 */
export async function presentMediaUrls<T>(value: T): Promise<T> {
  const storage = getStorage()
  return present(value, (key) => storage.urlFor(key)) as T
}
