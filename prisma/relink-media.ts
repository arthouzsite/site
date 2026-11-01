import 'dotenv/config'
import { formatRelinkSummary, relinkMedia } from '@/lib/server/media/relink'
import { getStorage } from '@/lib/server/media/storage/storage.provider'
import { prisma } from '@/lib/server/prisma'

/**
 * Rewrites every Media.url / thumbUrl from whatever absolute host it points at to the app's own media path
 * (`${MEDIA_URL_BASE}/<key>`), after checking the object exists in the configured bucket. Idempotent; rows whose
 * object is missing are left alone and make the script exit non-zero. Run with `pnpm media:relink`.
 */

async function main(): Promise<void> {
  try {
    const summary = await relinkMedia(prisma, getStorage())
    for (const key of summary.missingKeys) console.error(`missing in bucket: ${key}`)
    console.log(formatRelinkSummary(summary))
    if (summary.missingInBucket > 0) process.exitCode = 1
    console.log('done — now expire the site cache: POST /api/revalidate as an admin (see README)')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
