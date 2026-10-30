import { publicServiceListSchema, publicServiceSchema, type PublicService } from '@arthouz/shared'
import { unstable_rethrow } from 'next/navigation'
import { connection } from 'next/server'
import { apiGet } from './api'
import { TAGS } from './tags'

/** What the navigation needs from a service: enough to link to it, none of the body copy. */
export type NavService = Pick<PublicService, 'slug' | 'title'>

export function getServices(): Promise<PublicService[]> {
  return apiGet('/public/services', publicServiceListSchema, [TAGS.services])
}

export function getService(slug: string): Promise<PublicService> {
  return apiGet(`/public/services/${encodeURIComponent(slug)}`, publicServiceSchema, [TAGS.services, TAGS.service(slug)])
}

/** Published services for the header dropdown and mobile menu; an unavailable API leaves the plain link. */
export async function loadNavServices(): Promise<NavService[]> {
  try {
    return (await getServices()).map(({ slug, title }) => ({ slug, title }))
  } catch (error) {
    // A build-time `connection()` bail-out is not a failure: let it through so the shell renders per request.
    unstable_rethrow(error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] services unavailable for the navigation, rendering the plain link: ${detail}`)
    // A degraded shell must not be cached as the static page: render per request until the API is back.
    await connection()
    return []
  }
}
