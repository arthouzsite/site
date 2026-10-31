import type { MetadataRoute } from 'next'
import { buildSitemap } from '@/lib/sitemap-entries'

/** Re-generated hourly as well as on exhibition/artist/service tag revalidation (covers a build made while the API was down). */
export const revalidate = 3600

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap()
}
