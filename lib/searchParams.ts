export const EXHIBITION_STATUS_PARAMS = ['current', 'upcoming', 'past'] as const
export type ExhibitionStatusParam = (typeof EXHIBITION_STATUS_PARAMS)[number]
export type ExhibitionParams = { status?: ExhibitionStatusParam; city?: string }

type RawParams = Record<string, string | string[] | undefined>

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Validates the exhibitions list query string: unknown statuses and blank cities are dropped. */
export function parseExhibitionParams(raw: RawParams): ExhibitionParams {
  const status = EXHIBITION_STATUS_PARAMS.find((candidate) => candidate === single(raw.status))
  const city = single(raw.city)?.trim()
  return { ...(status ? { status } : {}), ...(city ? { city } : {}) }
}

/** `?status=…&city=…` for the set filters, or an empty string. */
export function buildExhibitionQuery(params: ExhibitionParams): string {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.city) query.set('city', params.city)
  const text = query.toString()
  return text ? `?${text}` : ''
}
