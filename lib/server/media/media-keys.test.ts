import { describe, expect, it } from 'vitest'
import { isServableKey, mediaUrlFor } from './media-keys'

const UUID = 'abcdef12-1234-4abc-9def-123456789abc'

describe('isServableKey', () => {
  it.each([
    'arthouz/seed/troika.jpg',
    'arthouz/seed/untitledK.jpg',
    'arthouz/seed/troika-thumb.webp',
    `arthouz/2026/${UUID}.jpg`,
    `arthouz/2026/${UUID}-thumb.webp`,
    `arthouz/2026/11/${UUID}.png`,
    `arthouz/2026/11/${UUID}-thumb.webp`,
    `arthouz/2026/${UUID}.mp4`,
    `arthouz/2026/11/${UUID}.webm`,
    `arthouz/2026/11/${UUID}.mov`,
  ])('accepts %s', (key) => expect(isServableKey(key)).toBe(true))

  it.each([
    '',
    'arthouz',
    'arthouz/',
    '../etc/passwd',
    'arthouz/../secret.jpg',
    'arthouz/seed/../x.jpg',
    'arthouz/seed/%2e%2e/x.jpg',
    'arthouz/seed/a/b.jpg',
    'arthouz//seed/a.jpg',
    'arthouz/seed//a.jpg',
    '/arthouz/seed/a.jpg',
    'arthouz/seed/a.jpg/',
    'arthouz/seed/a.jpg/extra',
    'arthouz/seed/a.JPG',
    'arthouz/seed/a.svg',
    'arthouz/seed/a.html',
    'arthouz/seed/a',
    'arthouz/seed/a.jpg.exe',
    'arthouz/seed/a b.jpg',
    'arthouz/seed/a\\b.jpg',
    'arthouz/seed/a\u0000.jpg',
    `arthouz/2026/${UUID.toUpperCase()}.jpg`,
    `arthouz/2026/${UUID}.JPG`,
    `arthouz/26/${UUID}.jpg`,
    `arthouz/2026/1/${UUID}.jpg`,
    `arthouz/2026/11/12/${UUID}.jpg`,
    `other/2026/${UUID}.jpg`,
    `arthouz/2026/${UUID}-thumb.jpg`,
    `arthouz/2026/${UUID}-thumb.webp.jpg`,
  ])('rejects %j', (key) => expect(isServableKey(key)).toBe(false))
})

describe('mediaUrlFor', () => {
  it('joins the base and key with a single slash', () => {
    expect(mediaUrlFor('/media', 'arthouz/a.jpg')).toBe('/media/arthouz/a.jpg')
    expect(mediaUrlFor('/media/', 'arthouz/a.jpg')).toBe('/media/arthouz/a.jpg')
    expect(mediaUrlFor('/media//', '/arthouz/a.jpg')).toBe('/media/arthouz/a.jpg')
    expect(mediaUrlFor('https://cdn.example.test', 'arthouz/a.jpg')).toBe('https://cdn.example.test/arthouz/a.jpg')
  })
})
