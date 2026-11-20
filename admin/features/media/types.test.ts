import { describe, expect, it } from 'vitest'
import { fileName } from './types'

describe('fileName', () => {
  it('shows the name the file was uploaded with', () => {
    expect(fileName({ key: 'arthouz/2026/870f6cc2-3301-4d22-9c3f-bf6ec67acb45.png', filename: 'image (17).png' })).toBe('image (17).png')
  })

  it('falls back to the last part of the key for media without a stored name', () => {
    expect(fileName({ key: 'arthouz/seed/nobles.jpg', filename: null })).toBe('nobles.jpg')
    expect(fileName({ key: 'arthouz/seed/nobles.jpg' })).toBe('nobles.jpg')
  })
})
