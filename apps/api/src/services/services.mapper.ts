import type { Prisma } from '../generated/prisma/client'
import { toImage } from '../common/image.mapper'

export const SERVICE_INCLUDE = { image: true } satisfies Prisma.ServiceInclude
export type ServiceRow = Prisma.ServiceGetPayload<{ include: typeof SERVICE_INCLUDE }>

export function toAdminService(row: ServiceRow) {
  return { ...row, image: toImage(row.image) }
}
