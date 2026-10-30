import type { ImgHTMLAttributes, ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn<(path: string) => Promise<unknown>>()
const apiTags: Array<[string, string[]]> = []

vi.mock('next/image', () => ({
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src as string} />
  ),
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  // Next's own control-flow errors pass through; anything else is the caller's to handle.
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_')) throw error
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

import ServicesPage, { generateMetadata as servicesMeta } from '@/app/services/page'
import ServicePage, { generateMetadata as serviceMeta } from '@/app/services/[slug]/page'
import ServiceNotFound from '@/app/services/[slug]/not-found'
import sitemap from '@/app/sitemap'
import { Header } from '@/components/site/Header'
import { ApiError } from '@/lib/api'
import { loadNavServices } from '@/lib/services'
import { TAGS } from '@/lib/tags'
import { bareService, publicServiceList, service } from './support/publicFixtures'

const settings = { site: { title: 'Art Houz', description: 'Gallery.', ogImage: null } }
const html = (node: ReactElement) => renderToStaticMarkup(node)
const params = <T,>(value: T) => Promise.resolve(value)

beforeEach(() => {
  apiGet.mockReset()
  apiTags.length = 0
  apiGet.mockImplementation(async (path) => {
    if (path === '/public/services') return publicServiceList
    if (path === '/public/settings') return settings
    const found = publicServiceList.find((item) => path === `/public/services/${item.slug}`)
    if (found) return found
    throw new ApiError('NOT_FOUND', 'missing', 404)
  })
})

describe('/services index', () => {
  it('renders one row per service with a read-more link to its page', async () => {
    const out = html(await ServicesPage())
    expect(out).toContain('<h1')
    for (const item of publicServiceList) {
      expect(out).toContain(`>${item.title}</h2>`)
      expect(out).toContain(`href="/services/${item.slug}"`)
    }
    expect(out).toContain('Acquire work from our artists.')
    expect(out).toContain('Read more')
    expect(out).toContain('about Art sales')
    expect(out).toContain('aria-hidden="true">→')
    expect(await servicesMeta()).toMatchObject({ title: 'Services' })
    expect(apiTags).toContainEqual(['/public/services', ['services']])
  })

  it('alternates the image side from the second row on wide screens', async () => {
    const out = html(await ServicesPage())
    const rows = out.split('<article').slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).not.toContain('min-[1024px]:flex-row-reverse')
    expect(rows[1]).toContain('min-[1024px]:flex-row-reverse')
    expect(rows[2]).not.toContain('min-[1024px]:flex-row-reverse')
    // Image first in the source so it also leads on a stacked mobile layout.
    expect(rows[0]!.indexOf('<img')).toBeLessThan(rows[0]!.indexOf('<h2'))
  })

  it('omits the summary when empty and shows the image placeholder without an image', async () => {
    apiGet.mockImplementation(async () => [bareService])
    const out = html(await ServicesPage())
    expect(out).toContain('Gallery on rent')
    expect(out).toContain('aria-label="Gallery on rent"')
    expect(out).not.toContain('<p')
  })

  it('shows an empty state when nothing is published', async () => {
    apiGet.mockImplementation(async () => [])
    const out = html(await ServicesPage())
    expect(out).toContain('No services are listed right now.')
    expect(out).not.toContain('<article')
  })
})

describe('/services/[slug]', () => {
  it('renders the image, title, summary, body paragraphs, contact block and the default CTA', async () => {
    const out = html(await ServicePage({ params: params({ slug: 'art-sales' }) }))
    expect(out).toContain('<h1')
    expect(out).toContain('>Art sales</h1>')
    expect(out).toContain('Acquire work from our artists.')
    expect(out).toContain('>First paragraph.</p>')
    expect(out).toContain('>Second paragraph.</p>')
    expect(out).toContain('<img')
    expect(out).toContain('A. Seller')
    expect(out).toContain('href="tel:+914411112222"')
    expect(out).toContain('href="mailto:sales@arthouz.example"')
    expect(out).toMatch(/<a[^>]+href="\/visit"[^>]*>Enquire/)
    expect(out).not.toContain('target="_blank"')
  })

  it('links back to the services index', async () => {
    const out = html(await ServicePage({ params: params({ slug: 'art-sales' }) }))
    expect(out).toContain('href="/services"')
  })

  it('omits the contact block when every contact field is empty', async () => {
    const out = html(await ServicePage({ params: params({ slug: 'gallery-on-rent' }) }))
    expect(out).not.toContain('Contact')
    expect(out).not.toContain('tel:')
    expect(out).not.toContain('mailto:')
    expect(out).toContain('aria-label="Gallery on rent"')
  })

  it('renders only the contact lines that are set', async () => {
    apiGet.mockImplementation(async () => ({ ...service, contact: { name: '', phone: '', email: 'sales@arthouz.example' } }))
    const out = html(await ServicePage({ params: params({ slug: 'art-sales' }) }))
    expect(out).toContain('Contact')
    expect(out).toContain('mailto:sales@arthouz.example')
    expect(out).not.toContain('tel:')
    expect(out).not.toContain('Name')
  })

  it('uses the ctaHref: external http(s) opens safely in a new tab, mailto stays in the page', async () => {
    apiGet.mockImplementation(async () => ({ ...service, ctaLabel: 'Book', ctaHref: 'https://book.example/x' }))
    const external = html(await ServicePage({ params: params({ slug: 'art-sales' }) }))
    expect(external).toMatch(/<a href="https:\/\/book\.example\/x" target="_blank" rel="noopener noreferrer"[^>]*>Book/)
    apiGet.mockImplementation(async () => ({ ...service, ctaHref: 'mailto:hello@arthouz.example' }))
    const mail = html(await ServicePage({ params: params({ slug: 'art-sales' }) }))
    expect(mail).toContain('href="mailto:hello@arthouz.example"')
    expect(mail).not.toContain('target="_blank"')
  })

  it('splits the body only on blank lines and skips empty paragraphs', async () => {
    apiGet.mockImplementation(async () => ({ ...service, body: 'One\nstill one.\r\n\r\n\n  \nTwo.\n\n' }))
    const out = html(await ServicePage({ params: params({ slug: 'art-sales' }) }))
    expect(out.match(/text-body">(One|Two)/g)).toHaveLength(2)
    expect(out).toContain('One\nstill one.')
  })

  it('renders no body paragraphs and no summary lead when both are empty', async () => {
    const out = html(await ServicePage({ params: params({ slug: 'gallery-on-rent' }) }))
    expect(out).not.toContain('<p')
  })

  it('builds metadata from the service, falling back to the first paragraph, then the title', async () => {
    const meta = await serviceMeta({ params: params({ slug: 'art-sales' }) })
    expect(meta).toMatchObject({ title: 'Art sales', description: 'Acquire work from our artists.' })
    expect(meta.openGraph).toMatchObject({ type: 'website', siteName: 'Art Houz', title: 'Art sales', images: [{ url: service.image!.url }] })
    apiGet.mockImplementation(async (path) => (path === '/public/settings' ? settings : { ...service, summary: '' }))
    expect(await serviceMeta({ params: params({ slug: 'art-sales' }) })).toMatchObject({ description: 'First paragraph.' })
    apiGet.mockImplementation(async (path) => (path === '/public/settings' ? settings : bareService))
    expect(await serviceMeta({ params: params({ slug: 'gallery-on-rent' }) })).toMatchObject({ description: 'Gallery on rent' })
  })

  it('fetches with the list tag and the slug tag, encoding the slug', async () => {
    await ServicePage({ params: params({ slug: 'art-sales' }) })
    expect(apiTags).toContainEqual(['/public/services/art-sales', ['services', 'service:art-sales']])
    expect(TAGS.service('a b')).toBe('service:a b')
  })

  it('calls notFound on a 404 and rethrows every other error', async () => {
    await expect(ServicePage({ params: params({ slug: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    await expect(serviceMeta({ params: params({ slug: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    apiGet.mockRejectedValue(new ApiError('HTTP_ERROR', 'boom', 500))
    await expect(ServicePage({ params: params({ slug: 'art-sales' }) })).rejects.toThrow('boom')
    apiGet.mockRejectedValue(new Error('network'))
    await expect(ServicePage({ params: params({ slug: 'art-sales' }) })).rejects.toThrow('network')
  })

  it('renders the not-found page with a way back', () => {
    const out = html(<ServiceNotFound />)
    expect(out).toContain('Service not found')
    expect(out).toContain('href="/services"')
  })
})

describe('header services list', () => {
  it('loads the published services as slug and title only, with the services tag', async () => {
    expect(await loadNavServices()).toEqual(publicServiceList.map(({ slug, title }) => ({ slug, title })))
    expect(apiTags).toContainEqual(['/public/services', ['services']])
  })

  it('degrades to no dropdown entries when the API is unavailable', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    apiGet.mockRejectedValue(new ApiError('NETWORK', 'down', 0))
    expect(await loadNavServices()).toEqual([])
    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })

  it('passes the list to the client header', async () => {
    const header = (await Header()) as ReactElement<{ children: ReactElement<{ children: ReactElement<{ services: unknown }>[] }> }>
    const [, client] = header.props.children.props.children
    expect(client?.props.services).toEqual(publicServiceList.map(({ slug, title }) => ({ slug, title })))
  })
})

describe('sitemap', () => {
  it('lists /services and every published service page', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://arthouz.test')
    apiGet.mockImplementation(async (path) => {
      if (path.startsWith('/public/services')) return publicServiceList
      if (path.startsWith('/public/artists')) return { flat: [] }
      return { items: [] }
    })
    const urls = (await sitemap()).map((entry) => entry.url)
    expect(urls).toContain('https://arthouz.test/services')
    expect(urls).toContain('https://arthouz.test/services/art-sales')
    expect(urls).toContain('https://arthouz.test/services/gallery-on-rent')
    vi.unstubAllEnvs()
  })

  it('drops only the services section when that endpoint fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://arthouz.test')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    apiGet.mockImplementation(async (path) => {
      if (path.startsWith('/public/services')) throw new ApiError('HTTP_ERROR', 'down', 500)
      if (path.startsWith('/public/artists')) return { flat: [] }
      return { items: [] }
    })
    const urls = (await sitemap()).map((entry) => entry.url)
    expect(urls).toContain('https://arthouz.test/services')
    expect(urls.some((url) => url.includes('/services/'))).toBe(false)
    error.mockRestore()
    vi.unstubAllEnvs()
  })
})
