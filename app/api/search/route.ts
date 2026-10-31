import { publicSearchSchema, type PublicSearch } from '@/lib/shared'
import { z } from 'zod'
import { apiGetUncached } from '@/lib/api'

const MAX_QUERY_LENGTH = 120
const querySchema = z.string().trim().max(MAX_QUERY_LENGTH)
const NO_STORE = { 'Cache-Control': 'no-store' } as const
const EMPTY: PublicSearch = { groups: [] }

function failure(status: number, code: string, message: string): Response {
  return Response.json({ ok: false, data: null, error: { code, message } }, { status, headers: NO_STORE })
}

/** Search for the overlay: validates `q`, runs the public search uncached and returns `{ groups }`. */
export async function GET(request: Request): Promise<Response> {
  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get('q') ?? '')
  if (!parsed.success) {
    return failure(400, 'VALIDATION_ERROR', `q must be at most ${MAX_QUERY_LENGTH} characters`)
  }
  const q = parsed.data
  if (!q) return Response.json(EMPTY, { headers: NO_STORE })
  try {
    const data = await apiGetUncached(`/public/search?q=${encodeURIComponent(q)}`, publicSearchSchema)
    return Response.json(data, { headers: NO_STORE })
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] search proxy failed for q=${JSON.stringify(q)}: ${detail}`)
    return failure(502, 'UPSTREAM_ERROR', 'Search is unavailable right now')
  }
}
