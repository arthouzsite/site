import type { Prisma } from '../generated/prisma/client'
import { toImage } from '../common/image.mapper'

export const FAIR_INCLUDE = { image: true } satisfies Prisma.FairInclude
export type FairRow = Prisma.FairGetPayload<{ include: typeof FAIR_INCLUDE }>

export function toAdminFair(row: FairRow) {
  const place = [row.venue, row.city].filter(Boolean).join(', ')
  return { ...row, image: toImage(row.image), where: `${place} · ${row.dateLabel}` }
}
