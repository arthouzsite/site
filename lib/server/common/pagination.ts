export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 200

export type Pagination = { page: number; limit: number; skip: number }

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback
}

export function parsePagination(query: { page?: unknown; limit?: unknown }): Pagination {
  const page = toPositiveInt(query.page, DEFAULT_PAGE)
  const limit = Math.min(toPositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT)
  return { page, limit, skip: (page - 1) * limit }
}
