import { ok } from '@/lib/shared'
import { route, type RouteContext } from '@/lib/server/http/route'
import { CACHE_CONTROL } from './public.constants'

type Params = Record<string, string | string[]>

/**
 * `route('public', ...)` plus the CDN cache header. The header is only set on success, so a thrown error
 * (mapped by the wrapper to a plain error response) is never cached.
 */
export function publicRoute<P extends Params = Record<string, never>>(
  handler: (ctx: RouteContext<P>) => unknown | Promise<unknown>,
): (request: Request, context: { params: Promise<P> }) => Promise<Response> {
  return route<P>('public', async (ctx) => {
    const data = await handler(ctx)
    return Response.json(ok(data ?? null), { headers: { 'cache-control': CACHE_CONTROL } })
  })
}
