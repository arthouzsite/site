import 'dotenv/config'
import * as argon2 from 'argon2'
import { PrismaPg } from '@prisma/adapter-pg'
import { slugify } from '@arthouz/shared'
import { PrismaClient } from '../src/generated/prisma/client'
import {
  seedArtists, seedExhibitions, seedFairs, seedLocations, seedMedia, seedNews, type SeedExhibition,
} from './seed/data'
import { exhibitionWorkTitle, materialFor, placeholderArtist, placeholderArtworks } from './seed/placeholders'
import { buildSettingValues, seedSettings } from './seed/settings'

const PICSUM_BASE = 'https://picsum.photos/seed/arthouz'
const SEED_KEY_PREFIX = 'seed/'
const MEDIA_WIDTH = 1200
const MEDIA_HEIGHT = 1000
const THUMB_WIDTH = 480
const THUMB_HEIGHT = 400
const UUID_PREFIX_LENGTH = 8
const ADMIN_NAME = 'Art Houz Admin'
const EXHIBITION_TYPES = { Solo: 'SOLO', Group: 'GROUP' } as const

export interface SeedOptions {
  readonly adminEmail: string
  readonly adminPassword: string
}

type IdMap = ReadonlyMap<string, string>

function lookup(map: IdMap, name: string, kind: string): string {
  const id = map.get(name)
  if (id === undefined) throw new Error(`seed: unknown ${kind} "${name}"`)
  return id
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

async function seedAdmin(prisma: PrismaClient, { adminEmail, adminPassword }: SeedOptions): Promise<void> {
  // Same normalisation as loginSchema, otherwise the seeded admin could never sign in.
  const email = adminEmail.trim().toLowerCase()
  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id })
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name: ADMIN_NAME, role: 'ADMIN' },
    update: {},
  })
}

async function seedMediaRows(prisma: PrismaClient): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const m of seedMedia) {
    const prefix = m.id.slice(0, UUID_PREFIX_LENGTH)
    const data = {
      url: `${PICSUM_BASE}${prefix}/${MEDIA_WIDTH}/${MEDIA_HEIGHT}`,
      thumbUrl: `${PICSUM_BASE}${prefix}/${THUMB_WIDTH}/${THUMB_HEIGHT}`,
      width: MEDIA_WIDTH,
      height: MEDIA_HEIGHT,
      mime: 'image/jpeg',
      bytes: 0,
      alt: m.alt,
    }
    const key = `${SEED_KEY_PREFIX}${m.name}`
    const row = await prisma.media.upsert({ where: { key }, create: { key, ...data }, update: data })
    ids.set(m.name, row.id)
  }
  return ids
}

async function seedArtistRows(prisma: PrismaClient, mediaIds: IdMap): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const a of seedArtists) {
    const p = placeholderArtist(a.name)
    const data = {
      name: a.name,
      sortName: a.name,
      medium: p.medium,
      base: p.base,
      born: p.born,
      lede: p.lede,
      bio: p.bio,
      portraitImageId: lookup(mediaIds, p.portraitMedia, 'media'),
      isFeatured: a.featuredOrder !== undefined,
      featuredOrder: a.featuredOrder ?? 0,
      isPublished: true,
    }
    const slug = slugify(a.name)
    const row = await prisma.artist.upsert({ where: { slug }, create: { slug, ...data }, update: data })
    ids.set(a.name, row.id)
  }
  return ids
}

async function seedArtworkRows(prisma: PrismaClient, artistIds: IdMap, mediaIds: IdMap): Promise<void> {
  for (const a of seedArtists) {
    const artistId = lookup(artistIds, a.name, 'artist')
    for (const w of placeholderArtworks(a.name)) {
      const data = {
        title: w.title, year: w.year, medium: w.medium, size: w.size,
        imageId: lookup(mediaIds, w.imageMedia, 'media'), isPublished: true,
      }
      const existing = await prisma.artwork.findFirst({ where: { artistId, sortOrder: w.sortOrder } })
      if (existing) await prisma.artwork.update({ where: { id: existing.id }, data })
      else await prisma.artwork.create({ data: { artistId, sortOrder: w.sortOrder, ...data } })
    }
  }
}

async function seedExhibitionWorks(
  prisma: PrismaClient, exhibitionId: string, e: SeedExhibition, artistIds: IdMap, mediaIds: IdMap,
): Promise<void> {
  for (const [i, mediaName] of e.works.entries()) {
    const artistName = e.artists[i % e.artists.length] as string
    const data = {
      imageId: lookup(mediaIds, mediaName, 'media'),
      title: exhibitionWorkTitle(e.slug, i),
      year: e.datesYear,
      artistId: lookup(artistIds, artistName, 'artist'),
      medium: materialFor(placeholderArtist(artistName).medium),
    }
    const existing = await prisma.exhibitionWork.findFirst({ where: { exhibitionId, sortOrder: i } })
    if (existing) await prisma.exhibitionWork.update({ where: { id: existing.id }, data })
    else await prisma.exhibitionWork.create({ data: { exhibitionId, sortOrder: i, ...data } })
  }
}

async function seedExhibitionRows(prisma: PrismaClient, artistIds: IdMap, mediaIds: IdMap): Promise<IdMap> {
  const ids = new Map<string, string>()
  for (const e of seedExhibitions) {
    const data = {
      title: e.title, subtitle: e.subtitle, city: e.city, country: e.country,
      type: EXHIBITION_TYPES[e.type as keyof typeof EXHIBITION_TYPES],
      startDate: toDate(e.startDate), endDate: toDate(e.endDate), datesLabel: e.datesLabel,
      statusOverride: null, venue: e.venue, blurb: e.blurb, body: e.body,
      heroImageId: lookup(mediaIds, e.heroImage, 'media'), isPublished: true, sortOrder: e.sortOrder,
    }
    const row = await prisma.exhibition.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data })
    ids.set(e.slug, row.id)
    for (const [i, name] of e.artists.entries()) {
      const artistId = lookup(artistIds, name, 'artist')
      await prisma.exhibitionArtist.upsert({
        where: { exhibitionId_artistId: { exhibitionId: row.id, artistId } },
        create: { exhibitionId: row.id, artistId, sortOrder: i },
        update: { sortOrder: i },
      })
    }
    await seedExhibitionWorks(prisma, row.id, e, artistIds, mediaIds)
  }
  return ids
}

async function seedFairRows(prisma: PrismaClient, mediaIds: IdMap): Promise<void> {
  for (const f of seedFairs) {
    const { slug, image, ...rest } = f
    const data = { ...rest, imageId: lookup(mediaIds, image, 'media'), isPublished: true }
    await prisma.fair.upsert({ where: { slug }, create: { slug, ...data }, update: data })
  }
}

async function seedNewsRows(prisma: PrismaClient, mediaIds: IdMap, exhibitionIds: IdMap): Promise<void> {
  for (const n of seedNews) {
    const data = {
      title: n.title, excerpt: n.excerpt, publishedAt: toDate(n.publishedAt),
      imageId: lookup(mediaIds, n.image, 'media'),
      exhibitionId: n.exhibition === null ? null : lookup(exhibitionIds, n.exhibition, 'exhibition'),
      isPublished: true,
    }
    await prisma.news.upsert({ where: { slug: n.slug }, create: { slug: n.slug, ...data }, update: data })
  }
}

async function seedLocationRows(prisma: PrismaClient, mediaIds: IdMap): Promise<void> {
  for (const l of seedLocations) {
    const { slug, image, ...rest } = l
    const data = { ...rest, imageId: lookup(mediaIds, image, 'media') }
    await prisma.location.upsert({ where: { slug }, create: { slug, ...data }, update: data })
  }
}

export async function seedDatabase(prisma: PrismaClient, opts: SeedOptions): Promise<void> {
  await seedAdmin(prisma, opts)
  const mediaIds = await seedMediaRows(prisma)
  const artistIds = await seedArtistRows(prisma, mediaIds)
  await seedArtworkRows(prisma, artistIds, mediaIds)
  const exhibitionIds = await seedExhibitionRows(prisma, artistIds, mediaIds)
  await seedFairRows(prisma, mediaIds)
  await seedNewsRows(prisma, mediaIds, exhibitionIds)
  await seedLocationRows(prisma, mediaIds)
  await seedSettings(
    prisma,
    buildSettingValues({
      mediaId: (name) => lookup(mediaIds, name, 'media'),
      artistId: (name) => lookup(artistIds, name, 'artist'),
    }),
  )
}

export type SeedOutcome = 'seeded' | 'skipped'

async function hasContent(prisma: PrismaClient): Promise<boolean> {
  const counts = await Promise.all([prisma.exhibition.count(), prisma.artist.count(), prisma.news.count(), prisma.fair.count()])
  return counts.some((count) => count > 0)
}

// The content upserts overwrite editor changes, so on a live database only the admin user is ensured.
export async function runSeed(prisma: PrismaClient, opts: SeedOptions, force: boolean): Promise<SeedOutcome> {
  if (!force && (await hasContent(prisma))) {
    await seedAdmin(prisma, opts)
    return 'skipped'
  }
  await seedDatabase(prisma, opts)
  return 'seeded'
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`seed: ${name} is required`)
  return value
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: requiredEnv('DATABASE_URL') }) })
  try {
    const outcome = await runSeed(
      prisma,
      { adminEmail: requiredEnv('SEED_ADMIN_EMAIL'), adminPassword: requiredEnv('SEED_ADMIN_PASSWORD') },
      process.env.SEED_FORCE === '1',
    )
    console.log(outcome === 'skipped' ? 'seed: content already present; set SEED_FORCE=1 to reload content' : 'seed: done')
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error('seed: failed', err)
    process.exit(1)
  })
}
