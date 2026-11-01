import { KEY_PREFIX } from './media.constants'
import { isUploadKey } from './upload-keys'

const THUMB_SUFFIX = '-thumb.webp'
const EXTENSIONS = 'jpg|jpeg|png|webp|avif|mp4|webm|mov'
// Seed names are alphanumeric (a couple carry a capital); the dash is allowed for hand-named files.
const SEED_KEY_PATTERN = new RegExp(`^${KEY_PREFIX}/seed/[A-Za-z0-9-]{1,100}\\.(${EXTENSIONS})$`)
// arthouz/<yyyy>/<mm>/<uuid>.<ext>; the yyyy-only shape is `isUploadKey`.
const MONTHLY_KEY_PATTERN = new RegExp(`^${KEY_PREFIX}/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.(${EXTENSIONS})$`)

function isStoredKey(key: string): boolean {
  return isUploadKey(key) || MONTHLY_KEY_PATTERN.test(key) || SEED_KEY_PATTERN.test(key)
}

/**
 * True only for keys this app has ever stored: seed files, `arthouz/<yyyy>/<uuid>.<ext>`, `arthouz/<yyyy>/<mm>/<uuid>.<ext>`
 * and their `-thumb.webp` variants. Anything else (traversal, case tricks, unknown extensions) is refused before storage is touched.
 */
export function isServableKey(key: string): boolean {
  if (typeof key !== 'string') return false
  if (!key.endsWith(THUMB_SUFFIX)) return isStoredKey(key)
  return isStoredKey(`${key.slice(0, -THUMB_SUFFIX.length)}.webp`)
}

/** `${base}/${key}` with exactly one slash between; the base may be a path (`/media`) or an absolute origin. */
export function mediaUrlFor(base: string, key: string): string {
  return `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`
}
