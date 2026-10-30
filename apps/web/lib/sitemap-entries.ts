import { publicServiceListSchema } from '@arthouz/shared'
import { z } from 'zod'
import type { MetadataRoute } from 'next'
import { unstable_rethrow } from 'next/navigation'
import { apiGet } from './api'
import { siteUrl } from './site-url'
import { TAGS } from './tags'

const STATIC_PATHS = ['/', '/exhibitions', '/artists', '/fairs', '/news', '/services', '/about', '/visit'] as const
const slugs = z.array(z.object({ slug: z.string().min(1) }))
const exhibitionSlugs = z.object({ items: slugs })
const artistSlugs = z.object({ flat: slugs })

/** Loads slugs for a sitemap section; an unavailable API drops the section rather than the whole sitemap. */
async function sectionPaths(load: () => Promise<{ slug: string }[]>, prefix: string): Promise<string[]> {
  try {
    return (await load()).map(({ slug }) => `${prefix}/${encodeURIComponent(slug)}`)
  } catch (error) {
    unstable_rethrow(error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] sitemap: ${prefix} slugs unavailable: ${detail}`)
    return []
  }
}

/** Static routes followed by every published exhibition, artist and service page. */
export async function buildSitemap(): Promise<MetadataRoute.Sitemap> {
  const [exhibitions, artists, services] = await Promise.all([
    sectionPaths(async () => (await apiGet('/public/exhibitions', exhibitionSlugs, [TAGS.exhibitions])).items, '/exhibitions'),
    sectionPaths(async () => (await apiGet('/public/artists', artistSlugs, [TAGS.artists])).flat, '/artists'),
    sectionPaths(() => apiGet('/public/services', publicServiceListSchema, [TAGS.services]), '/services'),
  ])
  const origin = siteUrl()
  return [...STATIC_PATHS, ...exhibitions, ...artists, ...services].map((path) => ({ url: path === '/' ? `${origin}/` : `${origin}${path}` }))
}
