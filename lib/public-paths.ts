import type { ZodType } from 'zod'
import { queryRecord } from '@/lib/server/http/parse'
import { publicReads } from '@/lib/server/public/public-reads'
import { publicExhibitionsQuerySchema, publicQSchema } from '@/lib/server/public/public.queries'
import { ApiError } from './api-error'

/** Any absolute origin works: only the pathname and query of a public path are read. */
const PLACEHOLDER_ORIGIN = 'http://x'
const BAD_REQUEST_STATUS = 400
const NOT_FOUND_STATUS = 404
const SLUG_SEGMENT = ':slug'

export type PublicLoader = () => Promise<unknown>

type Match = { path: string; url: URL; slug: string }
type PublicRoute = { pattern: string; resolve: (match: Match) => PublicLoader }

/** Validates the query with the route's own schema, so a server component gets no more leeway than an HTTP caller. */
function parseQuery<T>({ path, url }: Match, schema: ZodType<T>): T {
  const parsed = schema.safeParse(queryRecord(url))
  if (!parsed.success) throw new ApiError('VALIDATION', `GET ${path} has an invalid query: ${parsed.error.message}`, BAD_REQUEST_STATUS)
  return parsed.data
}

/** The thirteen `/api/public/*` routes, as the loaders those routes delegate to. */
const ROUTES: readonly PublicRoute[] = [
  { pattern: '/public/home', resolve: () => () => publicReads.getHome() },
  { pattern: '/public/about', resolve: () => () => publicReads.getAbout() },
  { pattern: '/public/settings', resolve: () => () => publicReads.getSettings() },
  { pattern: '/public/locations', resolve: () => () => publicReads.getLocations() },
  {
    pattern: '/public/exhibitions',
    resolve: (match) => {
      const query = parseQuery(match, publicExhibitionsQuerySchema)
      return () => publicReads.getExhibitions(query)
    },
  },
  { pattern: '/public/exhibitions/:slug', resolve: ({ slug }) => () => publicReads.getExhibition(slug) },
  {
    pattern: '/public/artists',
    resolve: (match) => {
      const query = parseQuery(match, publicQSchema)
      return () => publicReads.getArtists(query)
    },
  },
  { pattern: '/public/artists/:slug', resolve: ({ slug }) => () => publicReads.getArtist(slug) },
  { pattern: '/public/fairs', resolve: () => () => publicReads.getFairs() },
  { pattern: '/public/news', resolve: () => () => publicReads.getNews() },
  { pattern: '/public/services', resolve: () => () => publicReads.getServices() },
  { pattern: '/public/services/:slug', resolve: ({ slug }) => () => publicReads.getService(slug) },
  {
    pattern: '/public/search',
    resolve: (match) => {
      const { q } = parseQuery(match, publicQSchema)
      return () => publicReads.search(q)
    },
  },
]

function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/** The decoded slug when `segments` fit `pattern` (`''` for patterns without one); null when they do not. */
function matchSlug(pattern: string, segments: readonly string[]): string | null {
  const parts = pattern.split('/')
  if (parts.length !== segments.length) return null
  let slug = ''
  for (const [index, part] of parts.entries()) {
    const segment = segments[index] ?? ''
    if (part !== SLUG_SEGMENT) {
      if (part !== segment) return null
      continue
    }
    const decoded = segment ? decodeSegment(segment) : null
    if (!decoded) return null
    slug = decoded
  }
  return slug
}

/**
 * Turns a public API path (as the pages pass it to `apiGet`, e.g. `/public/exhibitions?status=current`) into a thunk
 * that runs the matching in-process loader. The query is validated now; the read happens when the thunk is called.
 */
export function resolvePublicPath(path: string): PublicLoader {
  const url = new URL(path, PLACEHOLDER_ORIGIN)
  const segments = url.pathname.split('/')
  for (const route of ROUTES) {
    const slug = matchSlug(route.pattern, segments)
    if (slug !== null) return route.resolve({ path, url, slug })
  }
  throw new ApiError('NOT_FOUND', `GET ${path} is not a public read`, NOT_FOUND_STATUS)
}
