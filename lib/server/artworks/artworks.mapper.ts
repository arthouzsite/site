import type { Prisma } from '@/lib/server/generated/prisma/client'
import { toImage } from '@/lib/server/common/image.mapper'

export const ARTWORK_INCLUDE = { image: true } satisfies Prisma.ArtworkInclude

export type ArtworkRow = Prisma.ArtworkGetPayload<{ include: typeof ARTWORK_INCLUDE }>

export function toAdminArtwork(row: ArtworkRow) {
  const { image } = row
  return {
    ...row,
    image: toImage(image),
  }
}
