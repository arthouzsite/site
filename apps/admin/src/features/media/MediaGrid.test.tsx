import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MediaGrid } from './MediaGrid'
import { makeMedia } from './testUtils'

const video = makeMedia({
  id: 'v1',
  kind: 'VIDEO',
  mime: 'video/mp4',
  key: 'media/v1.mp4',
  url: 'https://cdn.example/v1.mp4',
  thumbUrl: 'https://cdn.example/v1.mp4',
  width: 0,
  height: 0,
  bytes: 5_242_880,
  alt: 'Studio tour',
})

describe('MediaGrid', () => {
  it('renders images as img with dimensions', () => {
    const { container } = render(<MediaGrid items={[makeMedia()]} selectedId={null} onSelect={() => {}} />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn.example/m1-thumb.jpg')
    expect(container.querySelector('video')).toBeNull()
    expect(screen.queryByText('Video')).not.toBeInTheDocument()
    expect(screen.getByText('2400×1600')).toBeInTheDocument()
  })

  it('renders a video element with a Video chip and bytes only', () => {
    const { container } = render(<MediaGrid items={[video]} selectedId={null} onSelect={() => {}} />)
    const el = container.querySelector('video')!
    expect(el).toHaveAttribute('src', 'https://cdn.example/v1.mp4')
    expect(el).toHaveAttribute('preload', 'metadata')
    expect(el).toHaveAttribute('aria-label', 'Studio tour')
    expect(el.muted).toBe(true)
    expect(el.hasAttribute('controls')).toBe(false)
    expect(container.querySelector('img')).toBeNull()
    const tile = screen.getByRole('option')
    expect(within(tile).getByText('Video')).toBeInTheDocument()
    expect(within(tile).getByText('5.0 MB')).toBeInTheDocument()
    expect(tile).not.toHaveTextContent('0×0')
  })
})
