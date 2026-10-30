import { createRequire } from 'node:module'
import path from 'node:path'
import { PrismaClient } from '../../../api/src/generated/prisma/client'
import { API_DIR, VISUAL_DATABASE_URL, VISUAL_REVALIDATE_SECRET } from './env'
import { PORT_URL } from './paths'

const LAYOUT_KEY = 'artistIndexLayout'
const ARTIST_TAGS = ['artists', 'settings'] as const

export type ArtistIndexLayout = 'GROUPED' | 'FLOWING'
type DriverAdapter = NonNullable<NonNullable<ConstructorParameters<typeof PrismaClient>[0]>['adapter']>
type PgAdapterModule = { PrismaPg: new (config: { connectionString: string }) => DriverAdapter }

// The pg driver adapter is an apps/api dependency, so resolve it from there rather than adding it to apps/web.
const { PrismaPg } = createRequire(path.join(API_DIR, 'package.json'))('@prisma/adapter-pg') as PgAdapterModule

/** Upserts the artist index layout setting in the visual database and revalidates the cached artist pages. */
export async function setArtistIndexLayout(value: ArtistIndexLayout): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: VISUAL_DATABASE_URL }) })
  try {
    await prisma.setting.upsert({ where: { key: LAYOUT_KEY }, create: { key: LAYOUT_KEY, value }, update: { value } })
  } finally {
    await prisma.$disconnect()
  }
  const response = await fetch(`${PORT_URL}/api/revalidate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': VISUAL_REVALIDATE_SECRET },
    body: JSON.stringify({ tags: ARTIST_TAGS }),
  })
  if (!response.ok) throw new Error(`artist layout: revalidate failed with HTTP ${response.status}`)
}
