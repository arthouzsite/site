import type { PublicImage } from '@arthouz/shared'
import { describe, expect, it } from 'vitest'
import { coverFactor, coverSizes, fullWidthCoverSizes } from '@/components/home/coverSizes'

const landscape: PublicImage = { url: '/a.jpg', thumbUrl: '/a-t.jpg', width: 1200, height: 1000, alt: '' }

describe('coverFactor', () => {
  it('scales a landscape image up in a portrait box', () => {
    expect(coverFactor(landscape, 4 / 5)).toBe(1.5)
  })

  it('is 1 when the box is wider than the image', () => {
    expect(coverFactor(landscape, 3 / 2)).toBe(1)
  })

  it('is 1 without an image or with degenerate dimensions', () => {
    expect(coverFactor(null, 4 / 5)).toBe(1)
    expect(coverFactor({ ...landscape, height: 0 }, 4 / 5)).toBe(1)
  })
})

describe('coverSizes', () => {
  it('multiplies each slot width by the cover factor', () => {
    const sizes = coverSizes(landscape, 1, [{ media: '(min-width: 1440px)', width: '660px' }, { width: '100vw' }])
    expect(sizes).toBe('(min-width: 1440px) calc(660px * 1.2), calc(100vw * 1.2)')
  })

  it('leaves the widths untouched when the image is not cropped sideways', () => {
    expect(coverSizes(landscape, 3 / 2, [{ media: '(min-width: 960px)', width: '46vw' }, { width: '100vw' }])).toBe('(min-width: 960px) 46vw, 100vw')
  })
})

describe('fullWidthCoverSizes', () => {
  it('takes the wider of the viewport and the height-scaled image', () => {
    expect(fullWidthCoverSizes(landscape, 'clamp(420px, 76vh, 860px)')).toBe('max(100vw, calc(clamp(420px, 76vh, 860px) * 1.2))')
  })

  it('falls back to the viewport width without an image', () => {
    expect(fullWidthCoverSizes(null, '600px')).toBe('100vw')
  })
})
