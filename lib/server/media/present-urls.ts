import { logError } from '@/lib/server/log'
import { getStorage } from './storage/storage.provider'
import { isServableKey } from './media-keys'

const MS_PER_HOUR = 3_600_000
const MAX_LOGGED_KEYS = 5000
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

let loggedHour = -1
let loggedKeys = new Set<string>()

/** Logs a failed signing once per key per hour (a page can carry the same key many times); the caller falls back to `/media`. */
function reportSigningFailure(key: string, error: unknown): void {
  const hour = Math.floor(Date.now() / MS_PER_HOUR)
  if (hour !== loggedHour || loggedKeys.size >= MAX_LOGGED_KEYS) {
    loggedHour = hour
    loggedKeys = new Set()
  }
  if (loggedKeys.has(key)) return
  loggedKeys.add(key)
  logError(`Signing media URL failed for ${key}; serving /media fallback`, error instanceof Error ? error.stack : String(error))
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
 * pass through. Idempotent: a signed URL no longer starts with `/media/`. A key that cannot be signed keeps its
 * `/media/<key>` URL (the app route still serves it) and is logged once per hour.
 */
export async function presentMediaUrls<T>(value: T): Promise<T> {
  const storage = getStorage()
  const sign = async (key: string): Promise<string> => {
    try {
      return await storage.publicUrlFor(key)
    } catch (error) {
      reportSigningFailure(key, error)
      return `/media/${key}`
    }
  }
  return (await present(value, sign)) as T
}
