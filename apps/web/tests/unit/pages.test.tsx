import type { ImgHTMLAttributes, ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn<(path: string) => Promise<unknown>>()
const apiTags: Array<[string, string[]]> = []
const loadFooterData = vi.fn()

vi.mock('next/image', () => ({
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src as string} />
  ),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  unstable_rethrow: (error: unknown) => {
    throw error
  },
}))
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiGet: (path: string, _schema: unknown, tags: string[]) => {
    apiTags.push([path, tags])
    return apiGet(path)
  },
}))
vi.mock('@/lib/footer-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/footer-data')>()),
  loadFooterData: () => loadFooterData(),
}))
vi.mock('@/app/fonts', () => ({ fontVariables: 'font-a font-b' }))
vi.mock('@/styles/globals.css', () => ({}))

import AboutPage, { generateMetadata as aboutMeta } from '@/app/about/page'
import ArtistsPage, { metadata as artistsMeta } from '@/app/artists/page'
import ArtistPage, { generateMetadata as artistMeta } from '@/app/artists/[slug]/page'
import ExhibitionsPage, { metadata as exhibitionsMeta } from '@/app/exhibitions/page'
import ExhibitionPage, { generateMetadata as exhibitionMeta } from '@/app/exhibitions/[slug]/page'
import ExhibitionNotFound from '@/app/exhibitions/[slug]/not-found'
import FairsPage, { generateMetadata as fairsMeta } from '@/app/fairs/page'
import RootLayout, { generateMetadata as layoutMeta } from '@/app/layout'
import NotFound from '@/app/not-found'
import NewsPage, { generateMetadata as newsMeta } from '@/app/news/page'
import HomePage, { generateMetadata as homeMeta } from '@/app/page'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import VisitPage, { generateMetadata as visitMeta } from '@/app/visit/page'
import { Footer } from '@/components/site/Footer'
import { ApiError } from '@/lib/api'
import { SITE_TAGLINE } from '@/lib/footer-data'
import { currentYear } from '@/lib/site-clock'
import {
  about, artistDetail, artistList, exhibition, exhibitionDetail, fair, home, location, news,
} from './support/publicFixtures'

const settings = {
  heroLayout: 'SPLIT', artistIndexLayout: 'GROUPED',
  footer: { tagline: 'Tagline', instagramUrl: '', facebookUrl: '', copyrightFrom: 2012 },
  site: { title: 'Art Houz', description: 'Gallery.', ogImage: null },
}

const byPath: Record<string, unknown> = {
  '/public/home': home,
  '/public/settings': settings,
  '/public/about': about,
  '/public/fairs': [fair],
  '/public/news': [news],
  '/public/locations': [location],
  '/public/exhibitions': { items: [exhibition], cities: ['Chennai'] },
  '/public/exhibitions/salt-line': exhibitionDetail,
  '/public/artists': artistList,
  '/public/artists/parvathi-nayar': artistDetail,
}

const html = (node: ReactElement) => renderToStaticMarkup(node)
const params = <T,>(value: T) => Promise.resolve(value)

beforeEach(() => {
  apiGet.mockReset()
  apiTags.length = 0
  apiGet.mockImplementation(async (path) => {
    const key = path.split('?')[0]!
    if (key in byPath) return byPath[key]
    throw new ApiError('NOT_FOUND', 'missing', 404)
  })
  loadFooterData.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('list and static pages', () => {
  it('renders home with a hero, upcoming band and every section', async () => {
    const out = html(await HomePage())
    expect(out).toContain('Salt Line')
    expect(out).toContain('Artist in focus')
    expect(out).toContain('Tide Table')
    expect(await homeMeta()).toMatchObject({ title: { absolute: 'Art Houz' }, description: 'Gallery.' })
  })

  it('falls back to the default home title when the CMS site title is empty', async () => {
    byPath['/public/settings'] = { ...settings, site: { ...settings.site, title: '' } }
    try {
      expect(await homeMeta()).toMatchObject({ title: { absolute: 'Art Houz' } })
    } finally {
      byPath['/public/settings'] = settings
    }
  })

  it('renders home with the full-bleed hero and no hero or upcoming exhibition', async () => {
    apiGet.mockImplementation(async () => ({ ...home, heroLayout: 'FULL_BLEED' }))
    const fullBleed = html(await HomePage())
    expect(fullBleed).toContain('Salt Line')
    expect(fullBleed).toContain('h-[clamp(420px,76vh,860px)]')
    apiGet.mockImplementation(async () => ({ ...home, hero: null, upcoming: null }))
    const bare = html(await HomePage())
    expect(bare).toContain('Artist in focus')
    expect(bare).not.toContain('Tide Table')
    expect(bare).not.toContain('home-hero-title')
  })

  it('renders fairs, news, visit and about with metadata', async () => {
    expect(html(await FairsPage())).toContain('India Art Fair')
    expect(html(await NewsPage())).toContain('In the press')
    expect(html(await VisitPage())).toContain('Directions')
    expect(html(await AboutPage({ searchParams: params({ tab: 'services' }) }))).toContain('Framing')
    expect(html(await AboutPage({ searchParams: params({ tab: ['x'] }) }))).toContain('Statement.')
    expect(fairsMeta()).toHaveProperty('title', 'Fairs')
    expect(newsMeta()).toHaveProperty('title', 'News')
    expect(visitMeta()).toHaveProperty('title', 'Visit')
    expect(aboutMeta()).toHaveProperty('title', 'About')
  })

  it('renders the exhibitions list with its filters applied to the API query', async () => {
    const out = html(await ExhibitionsPage({ searchParams: params({ status: 'current', city: 'Chennai' }) }))
    expect(out).toContain('Salt Line')
    expect(apiGet).toHaveBeenCalledWith('/public/exhibitions?status=current&city=Chennai')
    apiGet.mockImplementation(async () => ({ items: [], cities: [] }))
    expect(html(await ExhibitionsPage({ searchParams: params({}) }))).toContain('No exhibitions match')
    expect(exhibitionsMeta).toHaveProperty('title', 'Exhibitions')
  })

  it('renders the artists index in both layouts and for an empty search', async () => {
    expect(html(await ArtistsPage({ searchParams: params({}) }))).toContain('id="L-N"')
    apiGet.mockImplementation(async () => ({ ...artistList, layout: 'FLOWING' }))
    expect(html(await ArtistsPage({ searchParams: params({ q: [' par '] }) }))).toContain('Parvathi Nayar')
    apiGet.mockImplementation(async () => ({ ...artistList, groups: [], flat: [] }))
    expect(html(await ArtistsPage({ searchParams: params({ q: 'zzz' }) }))).toContain('No artists match')
    expect(apiGet).toHaveBeenLastCalledWith('/public/artists?q=zzz')
    expect(artistsMeta).toHaveProperty('title', 'Artists')
  })
})

describe('detail pages', () => {
  it('renders an exhibition with works and press, and its metadata', async () => {
    const out = html(await ExhibitionPage({ params: params({ slug: 'salt-line' }) }))
    expect(out).toContain('Salt Line')
    expect(out).toContain('Works in the exhibition')
    expect(out).toContain('Press')
    const meta = await exhibitionMeta({ params: params({ slug: 'salt-line' }) })
    expect(meta).toMatchObject({ title: 'Salt Line', description: exhibition.blurb })
    expect(meta.openGraph).toMatchObject({
      type: 'website', siteName: 'Art Houz', title: 'Salt Line', description: exhibition.blurb,
      images: [{ url: exhibition.image!.url, width: exhibition.image!.width, height: exhibition.image!.height, alt: exhibition.image!.alt }],
    })
  })

  it('omits the press section and falls back to the site og image when there is no cover', async () => {
    apiGet.mockImplementation(async (path) => (path === '/public/settings' ? settings : { ...exhibitionDetail, press: [], image: null }))
    expect(html(await ExhibitionPage({ params: params({ slug: 'salt-line' }) }))).not.toContain('Press')
    const { openGraph } = await exhibitionMeta({ params: params({ slug: 'salt-line' }) })
    expect(openGraph).toMatchObject({ siteName: 'Art Houz', title: 'Salt Line' })
    expect(openGraph).not.toHaveProperty('images')
  })

  it('hides empty works sections on the detail pages', async () => {
    apiGet.mockImplementation(async () => ({ ...exhibitionDetail, works: [] }))
    expect(html(await ExhibitionPage({ params: params({ slug: 'salt-line' }) }))).not.toContain('Works in the exhibition')
    apiGet.mockImplementation(async () => ({ ...artistDetail, works: [] }))
    expect(html(await ArtistPage({ params: params({ slug: 'parvathi-nayar' }) }))).not.toContain('Selected works')
  })

  it('fetches detail pages with the list tag and the slug tag so any edit refreshes them', async () => {
    await ExhibitionPage({ params: params({ slug: 'salt-line' }) })
    await ArtistPage({ params: params({ slug: 'parvathi-nayar' }) })
    expect(apiTags).toContainEqual(['/public/exhibitions/salt-line', ['exhibitions', 'exhibition:salt-line']])
    expect(apiTags).toContainEqual(['/public/artists/parvathi-nayar', ['artists', 'artist:parvathi-nayar']])
  })

  it('renders an artist page and metadata', async () => {
    const out = html(await ArtistPage({ params: params({ slug: 'parvathi-nayar' }) }))
    expect(out).toContain('Exhibitions with Art Houz')
    expect(out).toContain('Selected works')
    const meta = await artistMeta({ params: params({ slug: 'parvathi-nayar' }) })
    expect(meta).toMatchObject({ title: 'Parvathi Nayar', description: 'Lede text.' })
    expect(meta.openGraph).toMatchObject({ type: 'website', siteName: 'Art Houz', title: 'Parvathi Nayar', description: 'Lede text.' })
  })

  it('omits the artist exhibitions block when absent', async () => {
    apiGet.mockImplementation(async () => ({ ...artistDetail, exhibitions: [], image: null }))
    expect(html(await ArtistPage({ params: params({ slug: 'parvathi-nayar' }) }))).not.toContain('Exhibitions with Art Houz')
  })

  it('calls notFound for a missing slug and rethrows other API errors', async () => {
    await expect(ExhibitionPage({ params: params({ slug: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(ArtistPage({ params: params({ slug: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    apiGet.mockRejectedValue(new ApiError('HTTP_ERROR', 'boom', 500))
    await expect(ExhibitionPage({ params: params({ slug: 'salt-line' }) })).rejects.toThrow('boom')
    await expect(ArtistPage({ params: params({ slug: 'parvathi-nayar' }) })).rejects.toThrow('boom')
  })

  it('renders the not-found pages', () => {
    expect(html(<NotFound />)).toContain('Not found')
    expect(html(<ExhibitionNotFound />)).toContain('Exhibition not found')
  })
})

describe('shell', () => {
  const footerData = {
    tagline: 'Tagline', copyrightFrom: 2012, instagramUrl: 'https://i.example', facebookUrl: null, locations: [location], degraded: false,
  }

  it('renders the footer with social links and the copyright range', async () => {
    loadFooterData.mockResolvedValue(footerData)
    const out = html((await Footer()) as ReactElement)
    expect(out).toContain('Tagline')
    expect(out).toContain('Instagram')
    expect(out).not.toContain('Facebook')
    expect(out).toMatch(/© 2012 – \d{4} Art Houz/)
  })

  it('skips social links whose href is not an http(s) URL', async () => {
    loadFooterData.mockResolvedValue({ ...footerData, instagramUrl: 'javascript:alert(1)', facebookUrl: 'facebook.com/arthouz' })
    const out = html((await Footer()) as ReactElement)
    expect(out).not.toContain('Instagram')
    expect(out).not.toContain('Facebook')
    loadFooterData.mockResolvedValue({ ...footerData, instagramUrl: 'https://i.example', facebookUrl: 'https://f.example' })
    const ok = html((await Footer()) as ReactElement)
    expect(ok).toContain('Instagram')
    expect(ok).toContain('Facebook')
  })

  it('renders a single year and no socials when the range starts this year', async () => {
    const year = currentYear()
    loadFooterData.mockResolvedValue({ ...footerData, copyrightFrom: year, instagramUrl: null, degraded: true })
    const out = html((await Footer()) as ReactElement)
    expect(out).toContain(`© ${year} Art Houz`)
    expect(out).not.toContain('Instagram')
  })

  it('wraps pages in the root layout and builds site metadata', async () => {
    loadFooterData.mockResolvedValue({ ...footerData, tagline: SITE_TAGLINE })
    // Header and Footer are async/stateful boundaries; assert on the returned tree rather than serialising it.
    const root = RootLayout({ children: (<p>page body</p>) as ReactNode })
    expect(root.props.className).toBe('font-a font-b')
    expect(root.props.lang).toBe('en')
    expect(await layoutMeta()).toHaveProperty('title.default', 'Art Houz')
  })

  it('serves robots.txt and the sitemap', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://arthouz.test')
    expect(robots().sitemap).toBe('https://arthouz.test/sitemap.xml')
    apiGet.mockImplementation(async (path) => (path.startsWith('/public/artists') ? artistList : { items: [exhibition], cities: [] }))
    const entries = await sitemap()
    expect(entries.map((e) => e.url)).toContain('https://arthouz.test/exhibitions/salt-line')
  })
})
