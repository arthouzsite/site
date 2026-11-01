import { randomUUID } from 'node:crypto'
import { MIME_BY_EXT } from './image.service'
import { KEY_PREFIX, VIDEO_EXT_BY_MIME } from './media.constants'

const EXT_BY_MIME: Readonly<Record<string, string>> = {
  ...Object.fromEntries(Object.entries(MIME_BY_EXT).map(([ext, mime]) => [mime, ext])),
  ...VIDEO_EXT_BY_MIME,
}

// arthouz/<yyyy>/<uuid>.<ext>; the strict shape also rules out path tricks before any storage call.
const UPLOAD_KEY_PATTERN = new RegExp(`^${KEY_PREFIX}/\\d{4}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|avif|mp4|webm|mov)$`)

/** File extension for an allowed image or video mime; undefined for anything else. */
export function extForMime(mime: string): string | undefined {
  return EXT_BY_MIME[mime]
}

/** Extension of a key produced by `allocateUploadKey`, or undefined when the key has none. */
export function extOfKey(key: string): string | undefined {
  return /\.([^./]+)$/.exec(key)?.[1]
}

export function isUploadKey(value: unknown): value is string {
  return typeof value === 'string' && UPLOAD_KEY_PATTERN.test(value)
}

/** A fresh object key for an upload of `mime`; the caller has already checked the mime is allowed. */
export function allocateUploadKey(mime: string, now: Date = new Date()): string {
  const ext = extForMime(mime)
  if (!ext) throw new Error(`No file extension for ${mime}`)
  return `${KEY_PREFIX}/${now.getUTCFullYear()}/${randomUUID()}.${ext}`
}
