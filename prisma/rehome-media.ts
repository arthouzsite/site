import 'dotenv/config'
import { env } from '@/lib/server/env'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { processImage } from '@/lib/server/media/image.service'
import { rehomedKey, selectCandidates, thumbKeyFor, withoutBucketObject } from '@/lib/server/media/rehome'
import { R2Storage } from '@/lib/server/media/storage/r2.storage'
import { prisma } from '@/lib/server/prisma'

/**
 * Moves every image row whose file is hosted outside the bucket (the seed's picsum placeholders)
 * into R2: downloads the original, re-encodes the thumbnail, uploads both and rewrites the row.
 * Idempotent: rows whose key already exists in the bucket are skipped. Run with `pnpm media:rehome`.
 */

const FETCH_TIMEOUT_MS = 30_000

type Outcome = { readonly key: string; readonly ok: boolean; readonly detail: string }

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function rehomeOne(
  db: PrismaClient,
  storage: R2Storage,
  row: { id: string; key: string; url: string },
): Promise<Outcome> {
  try {
    const buffer = await download(row.url)
    const processed = await processImage(buffer)
    const key = rehomedKey(row.key, processed.ext)
    const thumbKey = thumbKeyFor(key)
    const [original, thumb] = await Promise.all([
      storage.put(key, buffer, processed.mime),
      storage.put(thumbKey, processed.thumb, 'image/webp'),
    ])
    await db.media.update({
      where: { id: row.id },
      data: {
        key,
        url: original.url,
        thumbUrl: thumb.url,
        width: processed.width,
        height: processed.height,
        mime: processed.mime,
        bytes: buffer.length,
      },
    })
    return { key: row.key, ok: true, detail: original.url }
  } catch (error) {
    return { key: row.key, ok: false, detail: error instanceof Error ? error.message : String(error) }
  }
}

async function main(): Promise<void> {
  if (env.STORAGE_DRIVER !== 'r2') {
    throw new Error('rehome: STORAGE_DRIVER must be r2 with the S3_*/AWS_* keys set')
  }
  const storage = R2Storage.fromEnv(env)
  try {
    const rows = await prisma.media.findMany({ select: { id: true, key: true, url: true, kind: true } })
    const candidates = await withoutBucketObject(selectCandidates(rows), storage)
    console.log(`rehome: ${candidates.length} of ${rows.length} media rows are hosted outside the bucket`)
    const outcomes: Outcome[] = []
    for (const row of candidates) {
      const outcome = await rehomeOne(prisma, storage, row)
      console.log(`${outcome.ok ? 'ok  ' : 'FAIL'} ${outcome.key} -> ${outcome.detail}`)
      outcomes.push(outcome)
    }
    const failed = outcomes.filter((o) => !o.ok)
    if (failed.length > 0) throw new Error(`rehome: ${failed.length} of ${outcomes.length} rows failed; re-run to retry them`)
    console.log('done — now expire the site cache: POST /api/revalidate as an admin (see README)')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
