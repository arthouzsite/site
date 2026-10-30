import type { PublicImage } from '@arthouz/shared'
import type { Metadata } from 'next'
import { unstable_rethrow } from 'next/navigation'
import { SITE_TAGLINE } from './footer-data'
import { getSettings } from './site-data'
import { siteUrl } from './site-url'

type SiteInfo = { readonly title: string; readonly description: string; readonly ogImage: { url: string; width: number; height: number; alt: string } | null }

/** Used when /public/settings cannot be loaded (the Task 11 static shell defaults). */
export const FALLBACK_SITE: SiteInfo = { title: 'Art Houz', description: SITE_TAGLINE, ogImage: null }

export async function loadSite(): Promise<SiteInfo> {
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

function ogImages(image: Pick<PublicImage, 'url' | 'width' | 'height' | 'alt'> | null) {
  return image ? { images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] } : {}
}

type DetailMetadataInput = { title: string; description: string; image: PublicImage | null }

/**
 * Metadata for a detail page. A page-level `openGraph` replaces the root object wholesale, so it is built in full
 * here; the tab title goes through the root `%s · {site title}` template. Without its own image the site one is used.
 */
export async function detailMetadata({ title, description, image }: DetailMetadataInput): Promise<Metadata> {
  const site = await loadSite()
  return {
    title,
    description,
    openGraph: { type: 'website', siteName: site.title, title, description, ...ogImages(image ?? site.ogImage) },
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
      ...ogImages(ogImage),
    },
  }
}
