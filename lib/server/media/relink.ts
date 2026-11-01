import { thumbKeyFor } from './rehome'
import type { Storage } from './storage/storage.interface'

/** Rewrites stored media links from any absolute host to the app's own media path, once the object is confirmed to be in the bucket. */

export type RelinkRow = { readonly id: string; readonly key: string; readonly url: string; readonly thumbUrl: string; readonly kind: string }

/** The slice of Prisma the relink needs; a fake satisfies it in tests. */
export type RelinkDb = {
  media: {
    findMany(args: { select: { id: true; key: true; url: true; thumbUrl: true; kind: true } }): Promise<RelinkRow[]>
    update(args: { where: { id: string }; data: { url: string; thumbUrl: string } }): Promise<unknown>
  }
}

export type RelinkSummary = {
  readonly relinked: number
  readonly alreadyRelative: number
  readonly missingInBucket: number
  /** Keys with no object in the bucket (their rows are left untouched). */
  readonly missingKeys: readonly string[]
}

type Outcome = 'relinked' | 'alreadyRelative' | 'missing'

/** Images carry a derived thumbnail object; a video's thumbUrl is its own url. */
function linksFor(row: RelinkRow, storage: Pick<Storage, 'urlFor'>): { url: string; thumbUrl: string; objectKeys: string[] } {
  const isImage = row.kind === 'IMAGE'
  const thumbKey = isImage ? thumbKeyFor(row.key) : row.key
  return {
    url: storage.urlFor(row.key),
    thumbUrl: storage.urlFor(thumbKey),
    objectKeys: isImage ? [row.key, thumbKey] : [row.key],
  }
}

async function relinkRow(db: RelinkDb, storage: Pick<Storage, 'urlFor' | 'head'>, row: RelinkRow): Promise<Outcome> {
  const { url, thumbUrl, objectKeys } = linksFor(row, storage)
  if (row.url === url && row.thumbUrl === thumbUrl) return 'alreadyRelative'
  const found = await Promise.all(objectKeys.map((key) => storage.head(key)))
  if (found.some((info) => info === null)) return 'missing'
  await db.media.update({ where: { id: row.id }, data: { url, thumbUrl } })
  return 'relinked'
}

/** Idempotent: a row already pointing at its media path is counted and skipped; a row whose object is not in the bucket is left as it is. */
export async function relinkMedia(db: RelinkDb, storage: Pick<Storage, 'urlFor' | 'head'>): Promise<RelinkSummary> {
  const rows = await db.media.findMany({ select: { id: true, key: true, url: true, thumbUrl: true, kind: true } })
  const outcomes: Outcome[] = []
  for (const row of rows) outcomes.push(await relinkRow(db, storage, row))
  const count = (wanted: Outcome) => outcomes.filter((outcome) => outcome === wanted).length
  return {
    relinked: count('relinked'),
    alreadyRelative: count('alreadyRelative'),
    missingInBucket: count('missing'),
    missingKeys: rows.filter((_, index) => outcomes[index] === 'missing').map((row) => row.key),
  }
}

export function formatRelinkSummary(summary: RelinkSummary): string {
  return `relinked ${summary.relinked}, already relative ${summary.alreadyRelative}, missing in bucket ${summary.missingInBucket}`
}
