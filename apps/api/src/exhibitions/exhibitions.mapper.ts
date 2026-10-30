import { formatDateRange, resolveExhibitionStatus, STATUS_BADGE } from '@arthouz/shared'
import type { Prisma } from '../generated/prisma/client'
import { today } from '../config/clock'
import { toImage } from '../common/image.mapper'

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
    datesLabel: row.datesLabel ?? formatDateRange(row.startDate, row.endDate),
    artistLine: row.artists.map((a) => a.artist.name).join(', '),
    heroImage: toImage(heroImage),
  }
}
