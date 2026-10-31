import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { tagsFor, type TagEntity } from '@/lib/shared'
import { parseEnv } from '../src/config/env'
import { PrismaClient } from '../src/generated/prisma/client'
import { ImageService } from '../src/media/image.service'
import { chunk, rehomedKey, selectCandidates, thumbKeyFor } from '../src/media/rehome'
import { R2Storage } from '../src/media/storage/r2.storage'

/**
 * Moves every image row whose file is hosted outside the bucket (the seed's picsum placeholders)
 * into R2: downloads the original, re-encodes the thumbnail, uploads both and rewrites the row.
 * Idempotent: rows already served from AWS_S3_PUBLIC_URL are skipped. Run with `pnpm media:rehome`.
 */

const FETCH_TIMEOUT_MS = 30_000
const MAX_TAGS_PER_REQUEST = 100
const REVALIDATE_ENTITIES: readonly TagEntity[] = ['exhibition', 'artist', 'fair', 'service', 'news', 'location', 'setting']

type Outcome = { readonly key: string; readonly ok: boolean; readonly detail: string }

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

async function rehomeOne(
  prisma: PrismaClient,
  storage: R2Storage,
  images: ImageService,
  row: { id: string; key: string; url: string },
): Promise<Outcome> {
  try {
    const buffer = await download(row.url)
    const processed = await images.process(buffer)
    const key = rehomedKey(row.key, processed.ext)
    const thumbKey = thumbKeyFor(key)
    const [original, thumb] = await Promise.all([
      storage.put(key, buffer, processed.mime),
      storage.put(thumbKey, processed.thumb, 'image/webp'),
    ])
    await prisma.media.update({
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

async function revalidateSite(prisma: PrismaClient, webUrl: string, secret: string): Promise<void> {
  const [exhibitions, artists] = await Promise.all([
    prisma.exhibition.findMany({ select: { slug: true } }),
    prisma.artist.findMany({ select: { slug: true } }),
  ])
  const tags = new Set<string>(REVALIDATE_ENTITIES.flatMap((entity) => tagsFor(entity)))
  exhibitions.forEach((e) => tagsFor('exhibition', e.slug).forEach((t) => tags.add(t)))
  artists.forEach((a) => tagsFor('artist', a.slug).forEach((t) => tags.add(t)))
  for (const group of chunk([...tags], MAX_TAGS_PER_REQUEST)) {
    const response = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tags: group }),
    })
    if (!response.ok) throw new Error(`revalidate failed: HTTP ${response.status}`)
  }
  console.log(`rehome: revalidated ${tags.size} tags at ${webUrl}`)
}

async function main(): Promise<void> {
  const env = parseEnv(process.env)
  if (env.STORAGE_DRIVER !== 'r2' || !env.AWS_S3_PUBLIC_URL) {
    throw new Error('rehome: STORAGE_DRIVER must be r2 with the S3_*/AWS_* keys set')
  }
  const storage = R2Storage.fromEnv(env)
  const images = new ImageService()
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })
  try {
    const rows = await prisma.media.findMany({ select: { id: true, key: true, url: true, kind: true } })
    const candidates = selectCandidates(rows, env.AWS_S3_PUBLIC_URL)
    console.log(`rehome: ${candidates.length} of ${rows.length} media rows are hosted outside the bucket`)
    const outcomes: Outcome[] = []
    for (const row of candidates) {
      const outcome = await rehomeOne(prisma, storage, images, row)
      console.log(`${outcome.ok ? 'ok  ' : 'FAIL'} ${outcome.key} -> ${outcome.detail}`)
      outcomes.push(outcome)
    }
    const failed = outcomes.filter((o) => !o.ok)
    if (outcomes.length > failed.length) await revalidateSite(prisma, env.WEB_URL, env.REVALIDATE_SECRET)
    if (failed.length > 0) throw new Error(`rehome: ${failed.length} of ${outcomes.length} rows failed; re-run to retry them`)
    console.log('rehome: done')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
