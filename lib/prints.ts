import { publicPrintCategoryListSchema, publicPrintCategorySchema, type PublicPrintCategory } from '@/lib/shared'
import { unstable_rethrow } from 'next/navigation'
import { connection } from 'next/server'
import { apiGet } from './api'
import type { NavChild } from './nav'
import { TAGS } from './tags'

export function getPrints(): Promise<PublicPrintCategory[]> {
  return apiGet('/public/prints', publicPrintCategoryListSchema, [TAGS.prints])
}

export function getPrint(slug: string): Promise<PublicPrintCategory> {
  return apiGet(`/public/prints/${encodeURIComponent(slug)}`, publicPrintCategorySchema, [TAGS.prints, TAGS.print(slug)])
}

/** Print categories for the header dropdown and mobile menu; an unavailable API leaves the plain link. */
export async function loadNavPrints(): Promise<NavChild[]> {
  try {
    return (await getPrints()).map(({ slug, name }) => ({ slug, title: name }))
  } catch (error) {
    // A build-time `connection()` bail-out is not a failure: let it through so the shell renders per request.
    unstable_rethrow(error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] print categories unavailable for the navigation, rendering the plain link: ${detail}`)
    // A degraded shell must not be cached as the static page: render per request until the API is back.
    await connection()
    return []
  }
}
