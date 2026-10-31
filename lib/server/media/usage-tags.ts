import { tagsFor } from '@/lib/shared'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'
import type { MediaUsage } from './media.usage'

const unique = (values: readonly string[]): string[] => Array.from(new Set(values))
const exhibitionTagList = (slugs: readonly string[]) => slugs.flatMap((s) => tagsFor('exhibition', s))
const artistTagList = (slugs: readonly string[]) => slugs.flatMap((s) => tagsFor('artist', s))

// A failed lookup must never fail the write that triggered it: the caller still revalidates what it did resolve.
async function safely(label: string, lookup: () => Promise<string[]>): Promise<string[]> {
  try {
    return await lookup()
  } catch (error) {
    logError(`Related-tag lookup failed (${label}): ${String(error)}`)
    return []
  }
}

/** Tags for exhibition pages (given slugs) plus every artist page that lists them. */
const exhibitionFanOutTags = (exhibitionSlugs: readonly string[], artistSlugs: readonly string[]): string[] =>
  unique([...exhibitionTagList(exhibitionSlugs), ...artistTagList(artistSlugs)])

/** Tags for artist pages (given slugs) plus every exhibition page that lists them. */
const artistFanOutTags = (artistSlugs: readonly string[], exhibitionSlugs: readonly string[]): string[] =>
  unique([...artistTagList(artistSlugs), ...exhibitionTagList(exhibitionSlugs)])

function bucketUsage(usage: readonly MediaUsage[]): Record<string, string[]> {
  return usage.reduce<Record<string, string[]>>(
    (buckets, { type, id }) => ({ ...buckets, [type]: [...(buckets[type] ?? []), id] }),
    {},
  )
}

async function exhibitionUsageTags(prisma: PrismaClient, ids: string[]): Promise<string[]> {
  const rows = await prisma.exhibition.findMany({
    where: { id: { in: ids } },
    select: { slug: true, artists: { select: { artist: { select: { slug: true } } } } },
  })
  return exhibitionFanOutTags(rows.map((r) => r.slug), rows.flatMap((r) => r.artists.map((a) => a.artist.slug)))
}

async function workUsageTags(prisma: PrismaClient, ids: string[]): Promise<string[]> {
  const rows = await prisma.exhibitionWork.findMany({
    where: { id: { in: ids } },
    select: { exhibition: { select: { slug: true } }, artist: { select: { slug: true } } },
  })
  return exhibitionFanOutTags(rows.map((r) => r.exhibition.slug), rows.map((r) => r.artist.slug))
}

async function artistUsageTags(prisma: PrismaClient, ids: string[]): Promise<string[]> {
  const rows = await prisma.artist.findMany({
    where: { id: { in: ids } },
    select: { slug: true, exhibitions: { select: { exhibition: { select: { slug: true } } } } },
  })
  return artistFanOutTags(rows.map((r) => r.slug), rows.flatMap((r) => r.exhibitions.map((e) => e.exhibition.slug)))
}

async function artworkUsageTags(prisma: PrismaClient, ids: string[]): Promise<string[]> {
  const rows = await prisma.artwork.findMany({ where: { id: { in: ids } }, select: { artist: { select: { slug: true } } } })
  return rows.flatMap((r) => tagsFor('artwork', r.artist.slug))
}

async function serviceUsageTags(prisma: PrismaClient, ids: string[]): Promise<string[]> {
  const rows = await prisma.service.findMany({ where: { id: { in: ids } }, select: { slug: true } })
  return rows.flatMap((r) => tagsFor('service', r.slug))
}

/** Tags of every page that renders a media item, so alt/caption edits reach the public site. */
export async function mediaUsageTags(prisma: PrismaClient, usage: readonly MediaUsage[]): Promise<string[]> {
  const buckets = bucketUsage(usage)
  const staticTags: Record<string, string[]> = {
    fair: tagsFor('fair'),
    news: tagsFor('news'),
    location: tagsFor('location'),
    setting: tagsFor('setting'),
  }
  const fromStatic = Object.keys(buckets).flatMap((type) => staticTags[type] ?? [])
  const lookups: Array<[string, (ids: string[]) => Promise<string[]>]> = [
    ['exhibition', (ids) => exhibitionUsageTags(prisma, ids)],
    ['exhibitionWork', (ids) => workUsageTags(prisma, ids)],
    ['artist', (ids) => artistUsageTags(prisma, ids)],
    ['artwork', (ids) => artworkUsageTags(prisma, ids)],
    ['service', (ids) => serviceUsageTags(prisma, ids)],
  ]
  const resolved = await Promise.all(
    lookups.filter(([type]) => buckets[type]).map(([type, run]) => safely(`media usage ${type}`, () => run(buckets[type] as string[]))),
  )
  return unique([...fromStatic, ...resolved.flat()])
}
