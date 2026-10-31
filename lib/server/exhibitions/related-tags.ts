// Copied from the artists domain's related-tags (Task 4); only the exhibition fan-out helpers this domain uses.
import { tagsFor } from '@/lib/shared'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'

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

/** Tags for exhibition pages (given slugs, e.g. old and new) plus every artist page that lists them. */
export function exhibitionFanOutTags(exhibitionSlugs: readonly string[], artistSlugs: readonly string[]): string[] {
  return unique([...exhibitionTagList(exhibitionSlugs), ...artistTagList(artistSlugs)])
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
