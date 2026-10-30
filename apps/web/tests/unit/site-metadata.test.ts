import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import nextConfig from '@/next.config'
import { FALLBACK_SITE, loadSiteMetadata } from '@/lib/site-metadata'
import { buildSitemap } from '@/lib/sitemap-entries'

const API = 'http://api.test'
const SITE = 'https://arthouz.test'
const OG = { url: 'https://img.test/og.jpg', thumbUrl: 'https://img.test/og-t.jpg', width: 1200, height: 630, alt: 'Gallery' }

function settings(ogImage: typeof OG | null) {
  return {
    heroLayout: 'FULL_BLEED',
    artistIndexLayout: 'GROUPED',
    footer: { tagline: 't', instagramUrl: '', facebookUrl: '', copyrightFrom: 2012 },
    site: { title: 'Art Houz Gallery', description: 'Leading gallery.', ogImage },
  }
}

function ok(data: unknown): Response {
  return Response.json({ ok: true, data, error: null })
}

describe('site metadata, sitemap and redirects', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv('API_URL', API)
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE)
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('takes the default title, description and OG image from /public/settings', async () => {
    fetchMock.mockResolvedValue(ok(settings(OG)))

    const metadata = await loadSiteMetadata()

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${API}/public/settings`)
    expect(String(metadata.metadataBase)).toBe(`${SITE}/`)
    expect(metadata.title).toEqual({ default: 'Art Houz Gallery', template: '%s · Art Houz Gallery' })
    expect(metadata.description).toBe('Leading gallery.')
    expect(metadata.openGraph).toMatchObject({ siteName: 'Art Houz Gallery', images: [{ url: OG.url, width: 1200, height: 630, alt: 'Gallery' }] })
  })

  it('falls back to the static constants when the API is down', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    const metadata = await loadSiteMetadata()

    expect(metadata.title).toEqual({ default: FALLBACK_SITE.title, template: `%s · ${FALLBACK_SITE.title}` })
    expect(metadata.description).toBe(FALLBACK_SITE.description)
    expect(metadata.openGraph).toMatchObject({ siteName: FALLBACK_SITE.title })
    expect(metadata.openGraph?.images).toBeUndefined()
  })

  it('lists static routes plus published exhibition and artist slugs', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input)
      if (url.startsWith(`${API}/public/exhibitions`)) return ok({ items: [{ slug: 'tidewater' }], cities: [] })
      if (url.startsWith(`${API}/public/artists`)) return ok({ flat: [{ slug: 'vijay-pichumani' }] })
      throw new Error(`unexpected ${url}`)
    })

    const urls = (await buildSitemap()).map((entry) => entry.url)

    expect(urls).toEqual([
      `${SITE}/`, `${SITE}/exhibitions`, `${SITE}/artists`, `${SITE}/fairs`, `${SITE}/news`, `${SITE}/about`, `${SITE}/visit`,
      `${SITE}/exhibitions/tidewater`, `${SITE}/artists/vijay-pichumani`,
    ])
  })

  it('still lists the static routes when the API is down', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    expect(await buildSitemap()).toHaveLength(7)
  })

  it('permanently redirects the legacy section URLs', async () => {
    const redirects = await nextConfig.redirects?.()

    expect(redirects).toEqual([
      { source: '/exhibition/:path*', destination: '/exhibitions', permanent: true },
      { source: '/artist/:path*', destination: '/artists', permanent: true },
      { source: '/fair/:path*', destination: '/fairs', permanent: true },
      { source: '/news/:path+', destination: '/news', permanent: true },
      { source: '/contact', destination: '/visit', permanent: true },
    ])
  })
})
