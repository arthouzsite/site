import type { Prisma } from '@/lib/server/generated/prisma/client'
import { toImage } from '@/lib/server/common/image.mapper'

export const FAIR_INCLUDE = {
  image: true,
  gallery: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], include: { media: true } },
} satisfies Prisma.FairInclude
export type FairRow = Prisma.FairGetPayload<{ include: typeof FAIR_INCLUDE }>

export function toAdminFair(row: FairRow) {
  const place = [row.venue, row.city].filter(Boolean).join(', ')
  const { gallery, ...fair } = row
  return {
    ...fair,
    image: toImage(row.image),
    gallery: gallery.flatMap((g) => toImage(g.media) ?? []),
    where: `${place} · ${row.dateLabel}`,
  }
}
