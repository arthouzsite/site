import { describe, expect, test } from 'vitest'
import { tagsFor } from '../src/index'

describe('tagsFor', () => {
  test('exhibition tags', () =>
    expect(tagsFor('exhibition', 'tidewater')).toEqual(
      expect.arrayContaining(['home', 'search', 'exhibitions', 'exhibition:tidewater', 'artists']),
    ))
  test('exhibition without slug omits slug tag', () =>
    expect(tagsFor('exhibition').some((t) => t.startsWith('exhibition:'))).toBe(false))
  test('artist and artwork', () => {
    expect(tagsFor('artist', 'a')).toEqual(expect.arrayContaining(['home', 'search', 'artists', 'artist:a', 'exhibitions']))
    expect(tagsFor('artwork', 'a')).toEqual(expect.arrayContaining(['artists', 'artist:a', 'exhibitions']))
  })
  test('others', () => {
    expect(tagsFor('fair')).toEqual(expect.arrayContaining(['home', 'search', 'fairs']))
    expect(tagsFor('news')).toEqual(expect.arrayContaining(['news', 'exhibitions']))
    expect(tagsFor('location')).toEqual(expect.arrayContaining(['locations', 'about']))
    expect(tagsFor('setting')).toEqual(expect.arrayContaining(['settings', 'about', 'artists']))
    expect(tagsFor('media')).toEqual(expect.arrayContaining(['home', 'search']))
  })
  test('no duplicates', () => {
    const t = tagsFor('artist', 'a')
    expect(new Set(t).size).toBe(t.length)
  })
})
