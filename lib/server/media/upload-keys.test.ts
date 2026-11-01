import { describe, expect, it } from 'vitest'
import { allocateUploadKey, extForMime, extOfKey, isUploadKey } from './upload-keys'

describe('extForMime', () => {
  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/avif', 'avif'],
    ['video/mp4', 'mp4'],
    ['video/webm', 'webm'],
    ['video/quicktime', 'mov'],
  ])('maps %s to %s', (mime, ext) => expect(extForMime(mime)).toBe(ext))

  it('returns undefined for an unsupported mime', () => {
    expect(extForMime('image/heic')).toBeUndefined()
    expect(extForMime('text/html')).toBeUndefined()
  })
})

describe('allocateUploadKey', () => {
  it('builds arthouz/<year>/<uuid>.<ext> from the mime', () => {
    const key = allocateUploadKey('video/quicktime', new Date('2027-03-04T00:00:00Z'))
    expect(key).toMatch(/^arthouz\/2027\/[0-9a-f-]{36}\.mov$/)
    expect(isUploadKey(key)).toBe(true)
    expect(extOfKey(key)).toBe('mov')
  })

  it('is unique per call', () => {
    expect(allocateUploadKey('image/png')).not.toBe(allocateUploadKey('image/png'))
  })

  it('throws for a mime without an extension', () => {
    expect(() => allocateUploadKey('image/heic')).toThrow(/No file extension/)
  })
})

describe('isUploadKey', () => {
  const id = '12345678-1234-1234-1234-123456789012'
  it.each([`arthouz/2026/${id}.jpg`, `arthouz/2026/${id}.jpeg`, `arthouz/1999/${id}.webm`])('accepts %s', (key) => {
    expect(isUploadKey(key)).toBe(true)
  })

  it.each([
    `arthouz/2026/${id}.exe`,
    `arthouz/2026/${id}-thumb.webp`,
    `arthouz/2026/10/${id}.jpg`,
    `other/2026/${id}.jpg`,
    `arthouz/2026/../${id}.jpg`,
    `/arthouz/2026/${id}.jpg`,
    `arthouz/2026/${id}.jpg\n`,
    'arthouz/2026/short.jpg',
    '',
  ])('rejects %j', (key) => {
    expect(isUploadKey(key)).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isUploadKey(undefined)).toBe(false)
    expect(isUploadKey(42)).toBe(false)
  })
})
