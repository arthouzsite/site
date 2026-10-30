import type { ImgHTMLAttributes, ReactElement, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn<(path: string) => Promise<unknown>>()
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
  apiGet: (path: string) => apiGet(path),
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
    for (const meta of [fairsMeta, newsMeta, visitMeta, aboutMeta]) expect(meta()).toHaveProperty('title.absolute')
  })

  it('renders the exhibitions list with its filters applied to the API query', async () => {
    const out = html(await ExhibitionsPage({ searchParams: params({ status: 'current', city: 'Chennai' }) }))
    expect(out).toContain('Salt Line')
    expect(apiGet).toHaveBeenCalledWith('/public/exhibitions?status=current&city=Chennai')
    apiGet.mockImplementation(async () => ({ items: [], cities: [] }))
    expect(html(await ExhibitionsPage({ searchParams: params({}) }))).toContain('No exhibitions match')
    expect(exhibitionsMeta).toHaveProperty('title.absolute')
  })

  it('renders the artists index in both layouts and for an empty search', async () => {
    expect(html(await ArtistsPage({ searchParams: params({}) }))).toContain('id="L-N"')
    apiGet.mockImplementation(async () => ({ ...artistList, layout: 'FLOWING' }))
    expect(html(await ArtistsPage({ searchParams: params({ q: [' par '] }) }))).toContain('Parvathi Nayar')
    apiGet.mockImplementation(async () => ({ ...artistList, groups: [], flat: [] }))
    expect(html(await ArtistsPage({ searchParams: params({ q: 'zzz' }) }))).toContain('No artists match')
    expect(apiGet).toHaveBeenLastCalledWith('/public/artists?q=zzz')
    expect(artistsMeta).toHaveProperty('title.absolute')
  })
})

describe('detail pages', () => {
  it('renders an exhibition with works and press, and its metadata', async () => {
    const out = html(await ExhibitionPage({ params: params({ slug: 'salt-line' }) }))
    expect(out).toContain('Salt Line')
    expect(out).toContain('Works in the exhibition')
    expect(out).toContain('Press')
    expect(await exhibitionMeta({ params: params({ slug: 'salt-line' }) })).toMatchObject({
      title: { absolute: 'Salt Line – Art Houz' },
      openGraph: { images: [{ url: exhibition.image!.url }] },
    })
  })

  it('omits the press section and og image when there are none', async () => {
    apiGet.mockImplementation(async () => ({ ...exhibitionDetail, press: [], image: null }))
    expect(html(await ExhibitionPage({ params: params({ slug: 'salt-line' }) }))).not.toContain('Press')
    expect((await exhibitionMeta({ params: params({ slug: 'salt-line' }) })).openGraph).toBeUndefined()
  })

  it('renders an artist page and metadata', async () => {
    const out = html(await ArtistPage({ params: params({ slug: 'parvathi-nayar' }) }))
    expect(out).toContain('Exhibitions with Art Houz')
    expect(out).toContain('Selected works')
    expect(await artistMeta({ params: params({ slug: 'parvathi-nayar' }) })).toMatchObject({ description: 'Lede text.' })
  })

  it('omits the artist exhibitions block and og image when absent', async () => {
    apiGet.mockImplementation(async () => ({ ...artistDetail, exhibitions: [], image: null }))
    expect(html(await ArtistPage({ params: params({ slug: 'parvathi-nayar' }) }))).not.toContain('Exhibitions with Art Houz')
    expect((await artistMeta({ params: params({ slug: 'parvathi-nayar' }) })).openGraph).toBeUndefined()
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
