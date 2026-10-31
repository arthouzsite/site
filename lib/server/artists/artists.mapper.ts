import { indexLetter } from '@/lib/shared'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { toImage } from '@/lib/server/common/image.mapper'

export const ARTIST_INCLUDE = {
  portraitImage: true,
  _count: { select: { artworks: true } },
} satisfies Prisma.ArtistInclude

export type ArtistRow = Prisma.ArtistGetPayload<{ include: typeof ARTIST_INCLUDE }>

export function toAdminArtist(row: ArtistRow) {
  const { portraitImage, _count, ...rest } = row
  return {
    ...rest,
    artworkCount: _count.artworks,
    indexLetter: indexLetter(row.sortName),
    portraitImage: toImage(portraitImage),
  }
}
