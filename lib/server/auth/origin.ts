import { forbidden } from '@/lib/server/http/errors'

/** Mutating requests must come from this site: a present Origin header has to match the request origin. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin')
  if (origin === null || origin === new URL(request.url).origin) return
  throw forbidden('This request came from an unknown origin', 'BAD_ORIGIN')
}
