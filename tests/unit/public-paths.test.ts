import { beforeEach, describe, expect, it, vi } from 'vitest'

const LOADERS = [
  'getHome', 'getAbout', 'getSettings', 'getLocations', 'getExhibitions', 'getExhibition',
  'getArtists', 'getArtist', 'getFairs', 'getNews', 'getServices', 'getService', 'search',
] as const
type LoaderName = (typeof LOADERS)[number]

const reads = vi.hoisted(() => ({ calls: [] as Array<[string, unknown[]]> }))
vi.mock('@/lib/server/public/public-reads', () => ({
  publicReads: new Proxy({}, {
    get: (_target, name: string) => async (...args: unknown[]) => {
      reads.calls.push([name, args])
      return { loader: name }
    },
  }),
}))

import { ApiError } from '@/lib/api'
import { resolvePublicPath } from '@/lib/public-paths'

async function callFor(path: string): Promise<[string, unknown[]] | undefined> {
  await resolvePublicPath(path)()
  return reads.calls.at(-1)
}

beforeEach(() => {
  reads.calls.length = 0
})

describe('resolvePublicPath', () => {
  it.each<[string, LoaderName, unknown[]]>([
    ['/public/home', 'getHome', []],
    ['/public/about', 'getAbout', []],
    ['/public/settings', 'getSettings', []],
    ['/public/locations', 'getLocations', []],
    ['/public/exhibitions', 'getExhibitions', [{}]],
    ['/public/exhibitions?status=current&city=%20Chennai%20', 'getExhibitions', [{ status: 'CURRENT', city: 'Chennai' }]],
    ['/public/exhibitions/salt-line', 'getExhibition', ['salt-line']],
    ['/public/artists', 'getArtists', [{ q: '' }]],
    ['/public/artists?q=%20vij%20', 'getArtists', [{ q: 'vij' }]],
    ['/public/artists/vijay-pichumani', 'getArtist', ['vijay-pichumani']],
    ['/public/fairs', 'getFairs', []],
    ['/public/news', 'getNews', []],
    ['/public/services', 'getServices', []],
    ['/public/services/art-sales', 'getService', ['art-sales']],
    ['/public/search?q=a%26b%3Dc', 'search', ['a&b=c']],
    ['/public/search', 'search', ['']],
  ])('%s calls publicReads.%s', async (path, loader, args) => {
    // Act
    const call = await callFor(path)

    // Assert
    expect(call).toEqual([loader, args])
  })

  it('covers all thirteen public reads', async () => {
    const paths = ['/public/home', '/public/about', '/public/settings', '/public/locations', '/public/exhibitions',
      '/public/exhibitions/a', '/public/artists', '/public/artists/a', '/public/fairs', '/public/news',
      '/public/services', '/public/services/a', '/public/search?q=a']

    for (const path of paths) await callFor(path)

    expect(new Set(reads.calls.map(([name]) => name))).toEqual(new Set(LOADERS))
  })

  it('decodes an encoded slug segment', async () => {
    expect(await callFor(`/public/exhibitions/${encodeURIComponent('salt line/2')}`)).toEqual(['getExhibition', ['salt line/2']])
  })

  it('returns the loader result from the thunk without calling it eagerly', async () => {
    const load = resolvePublicPath('/public/fairs')

    expect(reads.calls).toHaveLength(0)
    await expect(load()).resolves.toEqual({ loader: 'getFairs' })
  })

  it.each([
    ['a search query over 120 characters', `/public/search?q=${'a'.repeat(121)}`],
    ['an artist query over 120 characters', `/public/artists?q=${'a'.repeat(121)}`],
    ['a city over the limit', `/public/exhibitions?city=${'c'.repeat(81)}`],
    ['an unknown status', '/public/exhibitions?status=soon'],
  ])('rejects %s with a 400 ApiError before any read', (_label, path) => {
    // Act
    const resolve = () => resolvePublicPath(path)

    // Assert
    expect(resolve).toThrow(ApiError)
    expect(resolve).toThrow(expect.objectContaining({ code: 'VALIDATION', status: 400 }))
    expect(reads.calls).toHaveLength(0)
  })

  it.each([
    '/public/nope',
    '/public',
    '/public/home/extra',
    '/public/exhibitions/',
    '/public/exhibitions/a/b',
    '/api/public/home',
    '/public/exhibitions/%E0%A4%A',
  ])('rejects the unknown path %s with NOT_FOUND', (path) => {
    expect(() => resolvePublicPath(path)).toThrow(expect.objectContaining({ name: 'ApiError', code: 'NOT_FOUND', status: 404 }))
  })
})
