import { KEY_PREFIX } from './media.constants'

/** Pure helpers for moving externally hosted media (seed placeholders) into the configured bucket. */

export type RehomeCandidate = { readonly id: string; readonly key: string; readonly url: string; readonly kind: string }

/** True when the row's file is not served from our bucket's public URL yet. */
export function needsRehome(url: string, publicUrl: string): boolean {
  const base = publicUrl.replace(/\/+$/, '')
  return !url.startsWith(`${base}/`) && !url.startsWith('memory://')
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

/** Rows to process: images not yet in the bucket (videos are uploaded only through the API, never seeded). */
export function selectCandidates(rows: readonly RehomeCandidate[], publicUrl: string): RehomeCandidate[] {
  return rows.filter((row) => row.kind === 'IMAGE' && needsRehome(row.url, publicUrl))
}

/** Splits tags into request-sized chunks for the web revalidate endpoint. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}
