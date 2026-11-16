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

const SAME_ORIGIN_FETCH_SITE = 'same-origin'

/**
 * For endpoints only the site's own pages call (the public enquiry form): the request must positively identify as
 * same-origin, by a matching Origin header or the browser-set `Sec-Fetch-Site: same-origin`. A request with neither
 * (curl, scripts) is refused, unlike `assertSameOrigin`, which lets header-less requests through. Run it after
 * `assertSameOrigin`, which already rejects a present but foreign Origin.
 */
export function assertBrowserSameOrigin(request: Request): void {
  if (request.headers.get('origin') !== null) return
  if (request.headers.get('sec-fetch-site') === SAME_ORIGIN_FETCH_SITE) return
  throw forbidden('This request came from an unknown origin', 'BAD_ORIGIN')
}
