import type { Metadata } from 'next'
import { unstable_rethrow } from 'next/navigation'
import { SITE_TAGLINE } from './footer-data'
import { getSettings } from './site-data'
import { siteUrl } from './site-url'

type SiteInfo = { readonly title: string; readonly description: string; readonly ogImage: { url: string; width: number; height: number; alt: string } | null }

/** Used when /public/settings cannot be loaded (the Task 11 static shell defaults). */
export const FALLBACK_SITE: SiteInfo = { title: 'Art Houz', description: SITE_TAGLINE, ogImage: null }

async function loadSite(): Promise<SiteInfo> {
  try {
    const { site } = await getSettings()
    return {
      title: site.title || FALLBACK_SITE.title,
      description: site.description || FALLBACK_SITE.description,
      ogImage: site.ogImage,
    }
  } catch (error) {
    // Let a build-time `connection()` bail-out through so the route renders per request until the API is back.
    unstable_rethrow(error)
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
    console.error(`[web] site settings unavailable, using default metadata: ${detail}`)
    return FALLBACK_SITE
  }
}

/** Root metadata: metadataBase from NEXT_PUBLIC_SITE_URL, title/description/OG image from the CMS settings. */
export async function loadSiteMetadata(): Promise<Metadata> {
  const site = await loadSite()
  const { ogImage } = site
  return {
    metadataBase: new URL(`${siteUrl()}/`),
    title: { default: site.title, template: `%s · ${site.title}` },
    description: site.description,
    openGraph: {
      type: 'website',
      siteName: site.title,
      title: site.title,
      description: site.description,
      ...(ogImage ? { images: [{ url: ogImage.url, width: ogImage.width, height: ogImage.height, alt: ogImage.alt }] } : {}),
    },
  }
}
