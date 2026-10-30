import type { Prisma } from '../generated/prisma/client'
import { toImage } from '../common/image.mapper'

export const LOCATION_INCLUDE = { image: true } satisfies Prisma.LocationInclude
export type LocationRow = Prisma.LocationGetPayload<{ include: typeof LOCATION_INCLUDE }>

export function toAdminLocation(row: LocationRow) {
  return { ...row, image: toImage(row.image) }
}
