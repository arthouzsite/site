import type { PublicImage } from '@/lib/shared'
import type { Media } from '@/lib/server/generated/prisma/client'
import { prisma } from '@/lib/server/prisma'

export function toPublicImage(media: Media | null | undefined): PublicImage | null {
  if (!media) return null
  const { url, thumbUrl, width, height, alt } = media
  return { url, thumbUrl, width, height, alt }
}

/** Resolves setting image ids with a single query. Unknown ids resolve to null. */
export async function resolveImages(
  ids: ReadonlyArray<string | null | undefined>,
): Promise<ReadonlyMap<string, PublicImage>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))]
  if (wanted.length === 0) return new Map()
  const rows = await prisma.media.findMany({ where: { id: { in: wanted }, kind: 'IMAGE' } })
  return new Map(rows.flatMap((m) => {
    const image = toPublicImage(m)
    return image ? [[m.id, image] as const] : []
  }))
}
