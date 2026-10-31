import { tagsFor } from '@/lib/shared'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'

// Subset of the old revalidate/related-tags module that the artists domain needs; the exhibition and
// media-usage helpers are ported with their own domains.

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

export function linkedExhibitionSlugs(prisma: PrismaClient, artistId: string): Promise<string[]> {
  return safely('exhibitions of artist', async () => {
    const rows = await prisma.exhibitionArtist.findMany({ where: { artistId }, select: { exhibition: { select: { slug: true } } } })
    return rows.map((r) => r.exhibition.slug)
  })
}

/** Tags for artist pages (given slugs, e.g. old and new) plus every exhibition page that lists them. */
export function artistFanOutTags(artistSlugs: readonly string[], exhibitionSlugs: readonly string[]): string[] {
  return unique([...artistTagList(artistSlugs), ...exhibitionTagList(exhibitionSlugs)])
}

/** Tags for an artist's exhibition links; call before a delete so the links are still readable. */
export async function artistTagsWithExhibitions(prisma: PrismaClient, artistId: string, slugs: readonly string[]): Promise<string[]> {
  return artistFanOutTags(slugs, await linkedExhibitionSlugs(prisma, artistId))
}
