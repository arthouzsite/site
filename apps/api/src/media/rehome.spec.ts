import { chunk, needsRehome, rehomedKey, selectCandidates, thumbKeyFor } from './rehome'

const PUBLIC_URL = 'https://cdn.example.test'

describe('needsRehome', () => {
  it('is true for external hosts and false for our bucket or memory urls', () => {
    expect(needsRehome('https://picsum.photos/seed/x/1200/1000', PUBLIC_URL)).toBe(true)
    expect(needsRehome('https://cdn.example.test/arthouz/seed/x.jpg', `${PUBLIC_URL}/`)).toBe(false)
    expect(needsRehome('memory://arthouz/a.jpg', PUBLIC_URL)).toBe(false)
  })

  it('does not match a host that merely starts with the public url', () => {
    expect(needsRehome('https://cdn.example.test.evil/a.jpg', PUBLIC_URL)).toBe(true)
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
  it('keeps only images hosted elsewhere', () => {
    const rows = [
      { id: '1', key: 'seed/a', url: 'https://picsum.photos/seed/a/1200/1000', kind: 'IMAGE' },
      { id: '2', key: 'arthouz/b.jpg', url: 'https://cdn.example.test/arthouz/b.jpg', kind: 'IMAGE' },
      { id: '3', key: 'arthouz/c.mp4', url: 'https://other.test/c.mp4', kind: 'VIDEO' },
    ]
    expect(selectCandidates(rows, PUBLIC_URL).map((r) => r.id)).toEqual(['1'])
  })
})

describe('chunk', () => {
  it('splits into fixed-size groups with a short tail', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 3)).toEqual([])
  })
})
