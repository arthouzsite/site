import { ok, type ApiMeta } from '@/lib/shared'
import { assertSameOrigin } from '@/lib/server/auth/origin'
import { MUTATING_METHODS } from '@/lib/server/auth/constants'
import { currentUser, requireUser } from '@/lib/server/auth/current-user'
import type { PublicUser } from '@/lib/server/auth/public-user'
import { mapError } from './errors'

export type Auth = 'public' | 'user' | 'admin'

export type RouteContext<P> = { request: Request; url: URL; params: P; user: PublicUser | null }

type RouteOptions = { status?: number }

const META_TAG = Symbol('arthouz.withMeta')

type MetaResult<T> = { data: T; meta: ApiMeta; [META_TAG]: true }

/** Return from a handler to send `{ data, meta }` (pagination) instead of a bare data envelope. */
export function withMeta<T>(data: T, meta: ApiMeta): MetaResult<T> {
  return { data, meta, [META_TAG]: true }
}

function isMetaResult(value: unknown): value is MetaResult<unknown> {
  return typeof value === 'object' && value !== null && META_TAG in value
}

function resolveUser(request: Request, auth: Auth): Promise<PublicUser | null> {
  if (auth === 'public') return currentUser(request)
  return requireUser(request, auth === 'admin' ? 'ADMIN' : undefined)
}

/**
 * Wraps a route handler with the cross-cutting rules every API endpoint shares: same-origin check for
 * mutating methods, session lookup and role gate, the `{ ok, data, error }` envelope and error mapping.
 */
export function route<P extends Record<string, string> = Record<string, never>>(
  auth: Auth,
  handler: (ctx: RouteContext<P>) => unknown | Promise<unknown>,
  options: RouteOptions = {},
): (request: Request, context: { params: Promise<P> }) => Promise<Response> {
  return async (request, context) => {
    try {
      if (MUTATING_METHODS.has(request.method)) assertSameOrigin(request)
      const user = await resolveUser(request, auth)
      const params = await context.params
      const result = await handler({ request, url: new URL(request.url), params, user })
      if (result instanceof Response) return result
      const status = options.status ?? 200
      const body = isMetaResult(result) ? ok(result.data, result.meta) : ok(result ?? null)
      return Response.json(body, { status })
    } catch (error) {
      const { status, body } = mapError(error)
      return Response.json(body, { status })
    }
  }
}
