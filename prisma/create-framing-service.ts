import 'dotenv/config'
import { createFramingService } from '@/lib/server/services/framing-service'
import { prisma } from '@/lib/server/prisma'

/**
 * Creates the published `framing-services` Service from the About page's stored Framing Services content.
 * Idempotent (skips when the slug exists) and leaves the About setting in place. Run with `pnpm services:framing`.
 */

async function main(): Promise<void> {
  try {
    const { status, slug } = await createFramingService(prisma)
    console.log(`${slug}: ${status}`)
    if (status === 'no-content') process.exitCode = 1
    if (status === 'created') console.log('done — now expire the site cache: POST /api/revalidate as an admin (see README)')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
