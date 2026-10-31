import { formatDateRange, resolveExhibitionStatus, STATUS_BADGE } from '@/lib/shared'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { today } from '@/lib/server/clock'
import { toImage } from '@/lib/server/common/image.mapper'

export const EXHIBITION_INCLUDE = {
  heroImage: true,
  artists: { orderBy: { sortOrder: 'asc' }, include: { artist: { select: { id: true, name: true } } } },
} satisfies Prisma.ExhibitionInclude

export type ExhibitionRow = Prisma.ExhibitionGetPayload<{ include: typeof EXHIBITION_INCLUDE }>

export function toAdminExhibition(row: ExhibitionRow) {
  const status = resolveExhibitionStatus(row, today())
  const { heroImage } = row
  return {
    ...row,
    status,
    statusLabel: STATUS_BADGE[status].label,
    datesLabelResolved: row.datesLabel ?? formatDateRange(row.startDate, row.endDate),
    artistLine: row.artists.map((a) => a.artist.name).join(', '),
    heroImage: toImage(heroImage),
  }
}
