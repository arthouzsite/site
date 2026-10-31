import { env } from '@/lib/server/env'
import { forbidden } from '@/lib/server/http/errors'

function originOf(url: string | undefined): string | null {
  return url ? new URL(url).origin : null
}

/**
 * Mutating requests must come from this site: a present Origin header has to match the request origin or,
 * behind a TLS-terminating proxy where request.url is plain http, the public origin in NEXT_PUBLIC_SITE_URL.
 */
export function assertSameOrigin(request: Request, siteUrl: string | undefined = env.NEXT_PUBLIC_SITE_URL): void {
  const origin = request.headers.get('origin')
  if (origin === null) return
  if (origin === new URL(request.url).origin || origin === originOf(siteUrl)) return
  throw forbidden('This request came from an unknown origin', 'BAD_ORIGIN')
}
