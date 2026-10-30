import { indexLetter } from '@arthouz/shared'
import type { Prisma } from '../generated/prisma/client'

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
    portraitImage: portraitImage
      ? { id: portraitImage.id, url: portraitImage.url, thumbUrl: portraitImage.thumbUrl, width: portraitImage.width, height: portraitImage.height, alt: portraitImage.alt }
      : null,
  }
}
