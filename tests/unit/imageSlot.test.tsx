// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import type { PublicImage } from '@/lib/shared'
import type { ImgHTMLAttributes } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ImageSlot } from '@/components/site/ImageSlot'

vi.mock('next/image', () => ({
  default: ({ fill, alt, src, className, style }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-fill={fill ? 'true' : 'false'} alt={alt} src={src} className={className} style={style} />
  ),
}))

const image: PublicImage = { url: 'https://x/y.jpg', thumbUrl: 'https://x/t.jpg', width: 1200, height: 1000, alt: 'A' }

function renderImg(img: PublicImage) {
  const { container } = render(<ImageSlot image={img} sizes="100vw" placeholder="p" />)
  return container.querySelector('img') as HTMLImageElement
}

describe('ImageSlot', () => {
  afterEach(cleanup)

  it('sizes both axes in container units and keeps object-cover', () => {
    const el = renderImg(image)
    expect(el.style.width).toContain('100cqw')
    expect(el.style.height).toContain('100cqh')
    expect(el.className).toContain('object-cover')
    expect(el.dataset.fill).toBe('false')
  })

  it('falls back to fill + object-cover when dimensions are not positive', () => {
    for (const bad of [{ width: 0, height: 1000 }, { width: 1200, height: -1 }, { width: Number.NaN, height: 10 }]) {
      const el = renderImg({ ...image, ...bad })
      expect(el.dataset.fill).toBe('true')
      expect(el.className).toContain('object-cover')
      expect(el.style.width).toBe('')
      cleanup()
    }
  })
})
