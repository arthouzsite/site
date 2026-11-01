import { describe, expect, it, vi } from 'vitest'
import { isHostedExternally, rehomedKey, selectCandidates, thumbKeyFor, withoutBucketObject } from './rehome'

describe('isHostedExternally', () => {
  it('is true for absolute urls and false for same-origin media paths', () => {
    expect(isHostedExternally('https://picsum.photos/seed/x/1200/1000')).toBe(true)
    expect(isHostedExternally('http://old-bucket.example.test/arthouz/a.jpg')).toBe(true)
    expect(isHostedExternally('/media/arthouz/a.jpg')).toBe(false)
  })
})

describe('rehomedKey', () => {
  it('prefixes seed keys and appends the detected extension', () => {
    expect(rehomedKey('seed/troika', 'jpg')).toBe('arthouz/seed/troika.jpg')
  })

  it('is idempotent for keys already under the prefix', () => {
    expect(rehomedKey('arthouz/seed/troika.jpg', 'webp')).toBe('arthouz/seed/troika.webp')
  })

  it('derives the thumb key next to the original', () => {
    expect(thumbKeyFor('arthouz/seed/troika.jpg')).toBe('arthouz/seed/troika-thumb.webp')
  })
})

describe('selectCandidates', () => {
  it('keeps only images at an absolute url', () => {
    const rows = [
      { id: '1', key: 'seed/a', url: 'https://picsum.photos/seed/a/1200/1000', kind: 'IMAGE' },
      { id: '2', key: 'arthouz/b.jpg', url: '/media/arthouz/b.jpg', kind: 'IMAGE' },
      { id: '3', key: 'arthouz/c.mp4', url: 'https://other.test/c.mp4', kind: 'VIDEO' },
    ]
    expect(selectCandidates(rows).map((r) => r.id)).toEqual(['1'])
  })
})

describe('withoutBucketObject', () => {
  it('drops rows whose object already exists in the bucket', async () => {
    const head = vi.fn(async (key: string) => (key === 'arthouz/seed/in.jpg' ? { bytes: 1, contentType: 'image/jpeg' } : null))
    const rows = [
      { id: '1', key: 'seed/out', url: 'https://picsum.photos/a', kind: 'IMAGE' },
      { id: '2', key: 'arthouz/seed/in.jpg', url: 'https://old-bucket.example.test/arthouz/seed/in.jpg', kind: 'IMAGE' },
    ]
    expect((await withoutBucketObject(rows, { head })).map((r) => r.id)).toEqual(['1'])
    expect(head).toHaveBeenCalledTimes(2)
  })
})
