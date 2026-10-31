import { tagsFor } from '@/lib/shared'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'
import { logError } from '@/lib/server/log'

// Copied from the exhibitions domain's related-tags (exhibitionSlugsByIds + exhibitionFanOutTags): news only
// needs these two. Fold back into the shared module when exhibitions lands.

const unique = (values: readonly string[]): string[] => Array.from(new Set(values))

/** Slugs of the given exhibitions. A failed lookup must never fail the write that triggered it, so it yields none. */
export async function exhibitionSlugsByIds(client: PrismaClient, ids: ReadonlyArray<string | null | undefined>): Promise<string[]> {
  const wanted = unique(ids.filter((id): id is string => Boolean(id)))
  if (wanted.length === 0) return []
  try {
    const rows = await client.exhibition.findMany({ where: { id: { in: wanted } }, select: { slug: true } })
    return rows.map((r) => r.slug)
  } catch (error) {
    logError(`Related-tag lookup failed (exhibitions by id): ${String(error)}`)
    return []
  }
}

/** Tags for the exhibition pages with the given slugs. */
export function exhibitionTagsForSlugs(exhibitionSlugs: readonly string[]): string[] {
  return unique(exhibitionSlugs.flatMap((slug) => tagsFor('exhibition', slug)))
}
