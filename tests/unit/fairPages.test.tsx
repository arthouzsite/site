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
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_')) throw error
  },
}))
vi.mock('@/lib/server/public/public-reads', () => ({ publicReads: {} }))
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiGet: (path: string, _schema: unknown, tags: string[]) => {
    apiTags.push([path, tags])
    return apiGet(path)
  },
}))

import FairPage, { generateMetadata as fairMeta } from '@/app/(site)/fairs/[slug]/page'
import FairNotFound from '@/app/(site)/fairs/[slug]/not-found'
import { FairRow } from '@/components/fairs/FairRow'
import { ApiError } from '@/lib/api'
import { fair, fairDetail, image } from './support/publicFixtures'

const settings = { site: { title: 'Art Houz', description: 'Gallery.', ogImage: null } }
const html = (node: ReactElement) => renderToStaticMarkup(node)
const params = <T,>(value: T) => Promise.resolve(value)
const slug = fairDetail.slug

beforeEach(() => {
  apiGet.mockReset()
  apiTags.length = 0
  apiGet.mockImplementation(async (path) => {
    if (path === '/public/settings') return settings
    if (path === `/public/fairs/${slug}`) return fairDetail
    throw new ApiError('NOT_FOUND', 'missing', 404)
  })
})

describe('/fairs/[slug]', () => {
  it('renders the fair with its cover, back link and every gallery image in order', async () => {
    const out = html(await FairPage({ params: params({ slug }) }))
    expect(out).toContain('>India Art Fair</h1>')
    expect(out).toContain('href="/fairs"')
    expect(out).toContain('Booth A1')
    expect(out).toContain('>Fair text.</p>')
    expect(out).toContain('>Gallery</h2>')
    expect(out.match(/<li>/g)).toHaveLength(fairDetail.gallery.length)
    expect(out.indexOf(fairDetail.gallery[0]!.url)).toBeLessThan(out.indexOf(fairDetail.gallery[1]!.url))
  })

  it('still renders with only the cover when the gallery is empty', async () => {
    apiGet.mockImplementation(async () => ({ ...fairDetail, gallery: [] }))
    const out = html(await FairPage({ params: params({ slug }) }))
    expect(out).toContain('>India Art Fair</h1>')
    expect(out).toContain('<img')
    expect(out).not.toContain('Gallery')
    expect(out).not.toContain('<li>')
  })

  it('shows the placeholder when the fair has neither cover nor gallery', async () => {
    apiGet.mockImplementation(async () => ({ ...fairDetail, image: null, gallery: [], booth: '', text: '' }))
    const out = html(await FairPage({ params: params({ slug }) }))
    expect(out).toContain('aria-label="India Art Fair"')
    expect(out).not.toContain('<img')
  })

  it('fetches with the list tag and the fair tag', async () => {
    await FairPage({ params: params({ slug }) })
    expect(apiTags).toContainEqual([`/public/fairs/${slug}`, ['fairs', `fair:${slug}`]])
  })

  it('builds metadata from the fair, using the cover and falling back to the first gallery image', async () => {
    const meta = await fairMeta({ params: params({ slug }) })
    expect(meta).toMatchObject({ title: 'India Art Fair', description: 'Fair text.' })
    expect(meta.openGraph).toMatchObject({ images: [{ url: image.url }] })
    apiGet.mockImplementation(async (path) => (path === '/public/settings' ? settings : { ...fairDetail, image: null, text: '' }))
    const fallback = await fairMeta({ params: params({ slug }) })
    expect(fallback).toMatchObject({ description: 'New Delhi' })
    expect(fallback.openGraph).toMatchObject({ images: [{ url: fairDetail.gallery[0]!.url }] })
  })

  it('calls notFound on a 404 and rethrows other errors', async () => {
    await expect(FairPage({ params: params({ slug: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    apiGet.mockRejectedValue(new ApiError('HTTP_ERROR', 'boom', 500))
    await expect(FairPage({ params: params({ slug }) })).rejects.toThrow('boom')
  })

  it('renders the not-found page with a way back', () => {
    const out = html(<FairNotFound />)
    expect(out).toContain('Fair not found')
    expect(out).toContain('href="/fairs"')
  })
})

describe('fair entries on /fairs', () => {
  it('keeps the title a crawlable link to the fair page, hinting at the overlay, when the fair has a gallery', () => {
    const out = html(<FairRow fair={{ ...fair, slug: 'art dubai', gallery: fairDetail.gallery }} />)
    expect(out).toMatch(/<h2[^>]*><a[^>]*href="\/fairs\/art%20dubai"[^>]*>India Art Fair<\/a><\/h2>/)
    expect(out).toContain('aria-haspopup="dialog"')
    expect(out).not.toContain('role="dialog"')
    expect(out).not.toContain('View fair')
  })

  it('renders a plain-text title, no link, when the fair has no gallery', () => {
    const out = html(<FairRow fair={fair} />)
    expect(out).toMatch(/<h2[^>]*>India Art Fair<\/h2>/)
    expect(out).not.toMatch(/<a[\s>]/)
    expect(out).not.toContain('aria-haspopup')
  })
})
