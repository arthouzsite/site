import { z } from 'zod'
import { EXHIBITION_STATUSES, type ExhibitionStatus } from '@/lib/shared'
import type { Prisma } from '@/lib/server/generated/prisma/client'
import { today } from '@/lib/server/clock'

const STATUS_QUERY_VALUES = EXHIBITION_STATUSES.map((s) => s.toLowerCase()) as [string, ...string[]]
const MAX_CITY_LENGTH = 80
const MAX_SEARCH_LENGTH = 120

export const exhibitionListQuerySchema = z.object({
  status: z
    .enum(STATUS_QUERY_VALUES)
    .transform((v) => v.toUpperCase() as ExhibitionStatus)
    .optional(),
  city: z.string().trim().max(MAX_CITY_LENGTH).optional(),
  q: z.string().trim().max(MAX_SEARCH_LENGTH).optional(),
  published: z.enum(['true', 'false']).optional(),
  artistId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).optional(),
})

export type ExhibitionListQuery = z.infer<typeof exhibitionListQuerySchema>

// Status is computed from dates unless overridden, so it is filtered in SQL using the same rule
// as resolveExhibitionStatus: an explicit override wins, otherwise compare dates with today().
export function statusWhere(status: ExhibitionStatus): Prisma.ExhibitionWhereInput {
  const now = today()
  const derived: Record<ExhibitionStatus, Prisma.ExhibitionWhereInput> = {
    UPCOMING: { startDate: { gt: now } },
    PAST: { endDate: { lt: now } },
    CURRENT: { startDate: { lte: now }, endDate: { gte: now } },
  }
  return { OR: [{ statusOverride: status }, { statusOverride: null, ...derived[status] }] }
}

export function listWhere(query: ExhibitionListQuery): Prisma.ExhibitionWhereInput {
  const and: Prisma.ExhibitionWhereInput[] = []
  if (query.status) and.push(statusWhere(query.status))
  if (query.city) and.push({ city: { equals: query.city, mode: 'insensitive' } })
  if (query.published === 'true' || query.published === 'false') and.push({ isPublished: query.published === 'true' })
  if (query.artistId) and.push({ artists: { some: { artistId: query.artistId } } })
  if (query.q) {
    and.push({ OR: [{ title: { contains: query.q, mode: 'insensitive' } }, { subtitle: { contains: query.q, mode: 'insensitive' } }] })
  }
  return { AND: and }
}

/**
 * Search params as a record that keeps repeated keys as arrays, so the schema rejects `?city=a&city=b`
 * instead of silently taking the last value.
 */
export function listQueryRecord(url: URL): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {}
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key)
    record[key] = values.length === 1 ? (values[0] as string) : values
  }
  return record
}
