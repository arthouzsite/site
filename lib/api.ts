import 'server-only'
import { unstable_cache } from 'next/cache'
import { connection } from 'next/server'
import type { ZodType } from 'zod'
import { ApiException } from '@/lib/server/http/errors'
import { ApiError } from './api-error'
import { resolvePublicPath, type PublicLoader } from './public-paths'

export { ApiError }

/**
 * Exhibition status is date-derived, so pages need a time-based refresh even without CMS edits;
 * CMS writes still expire tags immediately through `revalidateSite`.
 */
export const REVALIDATE_SECONDS = 3600

const OK_STATUS = 200
const NOT_FOUND_STATUS = 404

/**
 * The loader's result as the matching route would send it. `unstable_cache` stores JSON and hands back the live
 * value only on a miss, so the round trip makes a hit and a miss indistinguishable to the page.
 */
async function asJson(load: PublicLoader): Promise<unknown> {
  return JSON.parse(JSON.stringify((await load()) ?? null)) as unknown
}

/**
 * Maps a failed read onto `ApiError`. A 404 always becomes `NOT_FOUND` so pages can call `notFound()`. Anything
 * unexpected (database unreachable, a bug) is logged, then `connection()` defers the render to request time: during
 * `next build` the route is excluded from prerendering instead of failing the build, and at request time it
 * resolves immediately so the error reaches the error boundary.
 */
async function toApiError(path: string, error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) return error
  if (error instanceof ApiException) {
    const code = error.status === NOT_FOUND_STATUS ? 'NOT_FOUND' : error.code
    return new ApiError(code, error.message, error.status)
  }
  const detail = error instanceof Error ? error.message : String(error)
  // Logged before deferring: otherwise a build against an unreachable database silently ships every route dynamic.
  console.warn(`[web] GET ${path} failed: ${detail}`)
  await connection()
  return new ApiError('NETWORK', `GET ${path} failed: ${detail}`, 0)
}

async function read<T>(path: string, schema: ZodType<T>, run: () => Promise<unknown>): Promise<T> {
  let data: unknown
  try {
    data = await run()
  } catch (error) {
    throw await toApiError(path, error)
  }
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    throw new ApiError('INVALID_RESPONSE', `GET ${path} returned data that does not match the contract: ${parsed.error.message}`, OK_STATUS)
  }
  return parsed.data
}

/**
 * Reads a public path (`/public/...`, as the `/api/public/*` routes take it) in-process through Next's data cache,
 * keyed by `path` and tagged with `tags`, and validates the result with `schema`. Failed reads are never cached.
 */
export async function apiGet<T>(path: string, schema: ZodType<T>, tags: string[]): Promise<T> {
  const load = resolvePublicPath(path)
  const cached = unstable_cache(() => asJson(load), [path], { tags, revalidate: REVALIDATE_SECONDS })
  return read(path, schema, cached)
}

/** As `apiGet`, but never cached (per-keystroke search). */
export async function apiGetUncached<T>(path: string, schema: ZodType<T>): Promise<T> {
  const load = resolvePublicPath(path)
  return read(path, schema, () => asJson(load))
}
