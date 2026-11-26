import { describe, expect, it } from 'vitest'
import { IMAGE_LIMIT_HINT, MAX_IMAGE_DIMENSION_PX, MAX_IMAGE_UPLOAD_BYTES, imageLimitError } from '../index'

const MB = 1024 * 1024

describe('image limits', () => {
  it('are 5 MB and 4000 px', () => {
    expect(MAX_IMAGE_UPLOAD_BYTES).toBe(5 * MB)
    expect(MAX_IMAGE_DIMENSION_PX).toBe(4000)
    expect(IMAGE_LIMIT_HINT).toBe('Keep upload size up to 5 MB and 4000 px on the longer side')
  })

  it('accepts an image exactly at both limits', () => {
    expect(imageLimitError({ name: 'a.jpg', bytes: 5 * MB, width: 4000, height: 4000 })).toBeNull()
  })

  it('rejects a file one byte over 5 MB, naming the file and the limit', () => {
    const message = imageLimitError({ name: 'big.jpg', bytes: 5 * MB + 1 })
    expect(message).toContain('big.jpg')
    expect(message).toContain('5 MB')
  })

  it.each([
    [4001, 100],
    [100, 4001],
  ])('rejects %i x %i px, naming the file and the limit', (width, height) => {
    const message = imageLimitError({ name: 'wide.png', bytes: 1000, width, height })
    expect(message).toContain('wide.png')
    expect(message).toContain('4000 px')
  })

  it('checks size only when dimensions are unknown', () => {
    expect(imageLimitError({ name: 'a.jpg', bytes: 1000 })).toBeNull()
  })

  it('works without a file name (server messages)', () => {
    expect(imageLimitError({ bytes: 6 * MB })).toBe('Images must be 5 MB or smaller')
  })
})
