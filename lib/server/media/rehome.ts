import { KEY_PREFIX } from './media.constants'
import type { Storage } from './storage/storage.interface'

/** Pure helpers for moving externally hosted media (seed placeholders) into the configured bucket. */

export type RehomeCandidate = { readonly id: string; readonly key: string; readonly url: string; readonly kind: string }

/** True when the row points at an absolute URL, i.e. a file hosted outside the app (a seed placeholder or an old bucket host). */
export function isHostedExternally(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/** Stable object key for a re-homed row: `arthouz/<old key without extension>.<ext>`. Idempotent. */
export function rehomedKey(key: string, ext: string): string {
  const withoutPrefix = key.startsWith(`${KEY_PREFIX}/`) ? key.slice(KEY_PREFIX.length + 1) : key
  const withoutExt = withoutPrefix.replace(/\.[^./]+$/, '')
  return `${KEY_PREFIX}/${withoutExt}.${ext}`
}

export function thumbKeyFor(key: string): string {
  return key.replace(/\.[^./]+$/, '-thumb.webp')
}

/** Image rows whose file sits at an absolute URL; videos are uploaded only through the API, never seeded. */
export function selectCandidates(rows: readonly RehomeCandidate[]): RehomeCandidate[] {
  return rows.filter((row) => row.kind === 'IMAGE' && isHostedExternally(row.url))
}

/** A row is already in the bucket when an object exists under its key; only the rest need downloading and uploading. */
export async function withoutBucketObject(rows: readonly RehomeCandidate[], storage: Pick<Storage, 'head'>): Promise<RehomeCandidate[]> {
  const found = await Promise.all(rows.map((row) => storage.head(row.key)))
  return rows.filter((_, index) => found[index] === null)
}
