// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import type { PublicNews } from '@arthouz/shared'
import type { ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NewsArticle } from '@/components/news/NewsArticle'

vi.mock('next/image', () => ({
  default: ({ alt, src }: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}))

const base: PublicNews = {
  id: 'n1',
  slug: 'n1',
  title: 'English headline',
  excerpt: 'Excerpt',
  monthLabel: 'Oct 2026',
  externalUrl: null,
  exhibition: null,
  image: null,
}

describe('NewsArticle title font', () => {
  afterEach(cleanup)

  it('uses the display-tamil stack and lang=ta for a Tamil title', () => {
    render(<NewsArticle item={{ ...base, title: 'கலை கண்காட்சி' }} />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.className).toContain('font-display-tamil')
    expect(heading.getAttribute('lang')).toBe('ta')
  })

  it('uses the display-tamil stack without lang for an English title', () => {
    render(<NewsArticle item={base} />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.className).toContain('font-display-tamil')
    expect(heading.hasAttribute('lang')).toBe(false)
  })

  it('renders Read article only when externalUrl is set, and View exhibition when linked', () => {
    render(<NewsArticle item={{ ...base, externalUrl: 'https://x.test/a', exhibition: { slug: 'tidewater', title: 'T' } }} />)
    const read = screen.getByRole('link', { name: /Read article/ })
    expect(read.getAttribute('target')).toBe('_blank')
    expect(screen.getByRole('link', { name: /View exhibition/ }).getAttribute('href')).toBe('/exhibitions/tidewater')
  })
})
