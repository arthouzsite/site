import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const reads = vi.hoisted(() => ({ getSettings: vi.fn(), getExhibitions: vi.fn(), getArtists: vi.fn(), getServices: vi.fn() }))
vi.mock('@/lib/server/public/public-reads', () => ({ publicReads: reads }))
vi.mock('next/cache', () => ({ unstable_cache: (load: () => Promise<unknown>) => load }))
import configForPhase, { assertProductionSiteUrl, buildRemotePatterns } from '@/next.config'

const nextConfig = configForPhase('phase-development-server')
import { FALLBACK_SITE, detailMetadata, loadSiteMetadata } from '@/lib/site-metadata'
import { buildSitemap } from '@/lib/sitemap-entries'
import { service } from './support/publicFixtures'

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

describe('site metadata, sitemap and redirects', () => {
  const databaseDown = () => {
    for (const read of Object.values(reads)) read.mockRejectedValue(new Error('database down'))
  }

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE)
    for (const read of Object.values(reads)) read.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('takes the default title, description and OG image from /public/settings', async () => {
    reads.getSettings.mockResolvedValue(settings(OG))

    const metadata = await loadSiteMetadata()

    expect(reads.getSettings).toHaveBeenCalledTimes(1)
    expect(String(metadata.metadataBase)).toBe(`${SITE}/`)
    expect(metadata.title).toEqual({ default: 'Art Houz Gallery', template: '%s · Art Houz Gallery' })
    expect(metadata.description).toBe('Leading gallery.')
    expect(metadata.openGraph).toMatchObject({ siteName: 'Art Houz Gallery', images: [{ url: OG.url, width: 1200, height: 630, alt: 'Gallery' }] })
  })

  it('falls back to the static constants when the database is down', async () => {
    databaseDown()

    const metadata = await loadSiteMetadata()

    expect(metadata.title).toEqual({ default: FALLBACK_SITE.title, template: `%s · ${FALLBACK_SITE.title}` })
    expect(metadata.description).toBe(FALLBACK_SITE.description)
    expect(metadata.openGraph).toMatchObject({ siteName: FALLBACK_SITE.title })
    expect(metadata.openGraph?.images).toBeUndefined()
  })

  it('lists static routes plus published exhibition, artist and service slugs', async () => {
    reads.getExhibitions.mockResolvedValue({ items: [{ slug: 'tidewater' }], cities: [] })
    reads.getArtists.mockResolvedValue({ flat: [{ slug: 'vijay-pichumani' }] })
    reads.getServices.mockResolvedValue([service])

    const urls = (await buildSitemap()).map((entry) => entry.url)

    expect(urls).toEqual([
      `${SITE}/`, `${SITE}/exhibitions`, `${SITE}/artists`, `${SITE}/fairs`, `${SITE}/news`, `${SITE}/services`, `${SITE}/about`, `${SITE}/visit`,
      `${SITE}/exhibitions/tidewater`, `${SITE}/artists/vijay-pichumani`, `${SITE}/services/art-sales`,
    ])
  })

  it('still lists the static routes when the database is down', async () => {
    databaseDown()

    expect(await buildSitemap()).toHaveLength(8)
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

  it('detail metadata sets the full open graph object, falling back to the site image', async () => {
    reads.getSettings.mockResolvedValue(settings(OG))
    const cover = { url: 'https://img.test/c.jpg', thumbUrl: 'https://img.test/c-t.jpg', width: 800, height: 600, alt: 'Cover' }

    const withCover = await detailMetadata({ title: 'Salt Line', description: 'Blurb', image: cover })
    const withoutCover = await detailMetadata({ title: 'Salt Line', description: 'Blurb', image: null })

    expect(withCover.title).toBe('Salt Line')
    expect(withCover.openGraph).toEqual({
      type: 'website', siteName: 'Art Houz Gallery', title: 'Salt Line', description: 'Blurb',
      images: [{ url: cover.url, width: 800, height: 600, alt: 'Cover' }],
    })
    expect(withoutCover.openGraph).toMatchObject({ images: [{ url: OG.url }] })
  })

  it('detail metadata still builds when the settings read fails', async () => {
    databaseDown()

    const metadata = await detailMetadata({ title: 'Salt Line', description: 'Blurb', image: null })

    expect(metadata.openGraph).toMatchObject({ siteName: FALLBACK_SITE.title, title: 'Salt Line' })
  })
})

describe('next config guards', () => {
  const build = { NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }

  it('fails a production build without a public site URL', () => {
    expect(() => assertProductionSiteUrl({ ...build })).toThrow('NEXT_PUBLIC_SITE_URL')
    expect(() => assertProductionSiteUrl({ ...build, NEXT_PUBLIC_SITE_URL: '  ' })).toThrow('NEXT_PUBLIC_SITE_URL')
    expect(() => assertProductionSiteUrl({ ...build, NEXT_PUBLIC_SITE_URL: 'http://localhost:3100' })).toThrow('localhost')
    expect(() => assertProductionSiteUrl({ ...build, NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3100' })).toThrow('localhost')
  })

  it('accepts a real URL, the test override, and every non-build context', () => {
    expect(() => assertProductionSiteUrl({ ...build, NEXT_PUBLIC_SITE_URL: 'https://arthouz.example' })).not.toThrow()
    expect(() => assertProductionSiteUrl({ ...build, NEXT_PUBLIC_SITE_URL: 'http://localhost:3102', ALLOW_TEST_OVERRIDES: '1' })).not.toThrow()
    expect(() => assertProductionSiteUrl({ NODE_ENV: 'development' })).not.toThrow()
    expect(() => assertProductionSiteUrl({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-server' })).not.toThrow()
    // Next hands the phase to the config function; the env var is not set yet while the config loads.
    expect(() => assertProductionSiteUrl({ NODE_ENV: 'production' }, 'phase-production-build')).toThrow('NEXT_PUBLIC_SITE_URL')
    expect(() => configForPhase('phase-production-build')).not.toThrow()
  })

  it('allows picsum image hosts only outside production or with the test override', () => {
    const hosts = (env: Record<string, string>) => buildRemotePatterns(env).map((pattern) => pattern.hostname)

    expect(hosts({ NODE_ENV: 'development' })).toEqual(['picsum.photos', 'fastly.picsum.photos'])
    expect(hosts({ NODE_ENV: 'production' })).toEqual([])
    expect(hosts({ NODE_ENV: 'production', ALLOW_TEST_OVERRIDES: '1' })).toEqual(['picsum.photos', 'fastly.picsum.photos'])
  })

  it('allows the R2 hosts (virtual-hosted and path-style, any query) when the endpoint and bucket are set', () => {
    const r2 = { S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com', AWS_S3_BUCKET_NAME: 'arthouz' }

    expect(buildRemotePatterns({ NODE_ENV: 'production', ...r2 })).toEqual([
      { protocol: 'https', hostname: 'arthouz.acct.r2.cloudflarestorage.com', pathname: '/**' },
      { protocol: 'https', hostname: 'acct.r2.cloudflarestorage.com', pathname: '/**' },
    ])
    expect(buildRemotePatterns({ NODE_ENV: 'development', ...r2 }).map((pattern) => pattern.hostname)).toEqual([
      'picsum.photos', 'fastly.picsum.photos', 'arthouz.acct.r2.cloudflarestorage.com', 'acct.r2.cloudflarestorage.com',
    ])
    for (const pattern of buildRemotePatterns({ NODE_ENV: 'production', ...r2 })) expect(pattern).not.toHaveProperty('search')
  })

  it('adds no R2 host when either variable is missing or the endpoint is not a URL', () => {
    expect(buildRemotePatterns({ NODE_ENV: 'production', S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com' })).toEqual([])
    expect(buildRemotePatterns({ NODE_ENV: 'production', AWS_S3_BUCKET_NAME: 'arthouz' })).toEqual([])
    expect(buildRemotePatterns({ NODE_ENV: 'production', S3_ENDPOINT: 'nonsense', AWS_S3_BUCKET_NAME: 'arthouz' })).toEqual([])
  })
})
