import { tagsFor } from '@/lib/shared'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'
import type { MediaUsage } from '@/lib/server/media/media.usage'

const unique = (values: readonly string[]): string[] => Array.from(new Set(values))
const exhibitionTagList = (slugs: readonly string[]) => slugs.flatMap((s) => tagsFor('exhibition', s))
const artistTagList = (slugs: readonly string[]) => slugs.flatMap((s) => tagsFor('artist', s))

// A failed lookup must never fail the write that triggered it: callers still revalidate their own tags.
async function safely(label: string, lookup: () => Promise<string[]>): Promise<string[]> {
  try {
    return await lookup()
  } catch (error) {
    logError(`Related-tag lookup failed (${label}): ${String(error)}`)
    return []
  }
}

export function linkedArtistSlugs(prisma: PrismaClient, exhibitionId: string): Promise<string[]> {
  return safely('artists of exhibition', async () => {
    const rows = await prisma.exhibitionArtist.findMany({ where: { exhibitionId }, select: { artist: { select: { slug: true } } } })
    return rows.map((r) => r.artist.slug)
  })
}

export function artistSlugsByIds(prisma: PrismaClient, ids: readonly string[]): Promise<string[]> {
  return safely('artists by id', async () => {
    const rows = await prisma.artist.findMany({ where: { id: { in: [...ids] } }, select: { slug: true } })
    return rows.map((r) => r.slug)
  })
}

export function linkedExhibitionSlugs(prisma: PrismaClient, artistId: string): Promise<string[]> {
  return safely('exhibitions of artist', async () => {
    const rows = await prisma.exhibitionArtist.findMany({ where: { artistId }, select: { exhibition: { select: { slug: true } } } })
    return rows.map((r) => r.exhibition.slug)
  })
}

export function exhibitionSlugsByIds(prisma: PrismaClient, ids: ReadonlyArray<string | null | undefined>): Promise<string[]> {
  const wanted = unique(ids.filter((id): id is string => Boolean(id)))
  if (wanted.length === 0) return Promise.resolve([])
  return safely('exhibitions by id', async () => {
    const rows = await prisma.exhibition.findMany({ where: { id: { in: wanted } }, select: { slug: true } })
    return rows.map((r) => r.slug)
  })
}

/** Tags for exhibition pages (given slugs, e.g. old and new) plus every artist page that lists them. */
export function exhibitionFanOutTags(exhibitionSlugs: readonly string[], artistSlugs: readonly string[]): string[] {
  return unique([...exhibitionTagList(exhibitionSlugs), ...artistTagList(artistSlugs)])
}

/** Tags for artist pages (given slugs, e.g. old and new) plus every exhibition page that lists them. */
export function artistFanOutTags(artistSlugs: readonly string[], exhibitionSlugs: readonly string[]): string[] {
  return unique([...artistTagList(artistSlugs), ...exhibitionTagList(exhibitionSlugs)])
}

/** Tags for an exhibition's current artist links; call before a delete so the links are still readable. */
export async function exhibitionTagsWithArtists(
  prisma: PrismaClient,
  exhibitionId: string,
  slugs: readonly string[],
  extraArtistSlugs: readonly string[] = [],
): Promise<string[]> {
  const linked = await linkedArtistSlugs(prisma, exhibitionId)
  return exhibitionFanOutTags(slugs, [...linked, ...extraArtistSlugs])
}

/** Tags for an artist's exhibition links; call before a delete so the links are still readable. */
export async function artistTagsWithExhibitions(prisma: PrismaClient, artistId: string, slugs: readonly string[]): Promise<string[]> {
  return artistFanOutTags(slugs, await linkedExhibitionSlugs(prisma, artistId))
}

type UsageBuckets = Record<string, string[]>

function bucketUsage(usage: readonly MediaUsage[]): UsageBuckets {
  return usage.reduce<UsageBuckets>((buckets, { type, id }) => ({ ...buckets, [type]: [...(buckets[type] ?? []), id] }), {})
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
