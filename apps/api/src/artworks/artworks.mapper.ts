import type { Prisma } from '../generated/prisma/client'

export const ARTWORK_INCLUDE = { image: true } satisfies Prisma.ArtworkInclude

export type ArtworkRow = Prisma.ArtworkGetPayload<{ include: typeof ARTWORK_INCLUDE }>

export function toAdminArtwork(row: ArtworkRow) {
  const { image } = row
  return {
    ...row,
    image: image ? { id: image.id, url: image.url, thumbUrl: image.thumbUrl, width: image.width, height: image.height, alt: image.alt } : null,
  }
}
