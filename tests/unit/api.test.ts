import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const getService = vi.fn()
const getFairs = vi.fn()
const search = vi.fn()
vi.mock('@/lib/server/public/public-reads', () => ({
  publicReads: {
    getService: (slug: string) => getService(slug),
    getFairs: () => getFairs(),
    search: (q: string) => search(q),
  },
}))
// Pass-through cache: records how each read is keyed and tagged, then runs the loader.
type Loader = () => Promise<unknown>
const unstableCache = vi.fn<(load: Loader, keyParts: string[], options: object) => Loader>((load) => load)
vi.mock('next/cache', () => ({
  unstable_cache: (load: Loader, keyParts: string[], options: object) => unstableCache(load, keyParts, options),
}))
const connection = vi.fn(async () => undefined)
vi.mock('next/server', () => ({ connection: () => connection() }))

import { ApiError, REVALIDATE_SECONDS, apiGet, apiGetUncached } from '@/lib/api'
import { ApiException, badRequest, notFound } from '@/lib/server/http/errors'

const itemSchema = z.object({ slug: z.string(), count: z.number() })

beforeEach(() => {
  for (const mock of [getService, getFairs, search, unstableCache, connection]) mock.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apiGet', () => {
  it('reads the matching public loader through the data cache keyed by path with the given tags', async () => {
    // Arrange
    getService.mockResolvedValue({ slug: 'art-sales', count: 3, extra: 'x' })

    // Act
    const result = await apiGet('/public/services/art-sales', itemSchema, ['services', 'service:art-sales'])

    // Assert
    expect(result).toEqual({ slug: 'art-sales', count: 3 })
    expect(getService).toHaveBeenCalledWith('art-sales')
    expect(unstableCache).toHaveBeenCalledTimes(1)
    expect(unstableCache.mock.calls[0]?.slice(1)).toEqual([
      ['/public/services/art-sales'],
      { tags: ['services', 'service:art-sales'], revalidate: REVALIDATE_SECONDS },
    ])
    expect(REVALIDATE_SECONDS).toBe(3600)
  })

  it('hands pages the JSON a route would send, so a cache miss and a cache hit look the same', async () => {
    getService.mockResolvedValue({ slug: 'art-sales', count: 1, at: new Date('2026-10-30T00:00:00.000Z'), gone: undefined })

    const result = await apiGet('/public/services/art-sales', z.object({ at: z.string() }).passthrough(), [])

    expect(result).toEqual({ slug: 'art-sales', count: 1, at: '2026-10-30T00:00:00.000Z' })
  })

  it('maps a 404 ApiException from the loader to a NOT_FOUND ApiError so pages can call notFound()', async () => {
    // Arrange
    getService.mockRejectedValue(notFound('No such service'))

    // Act
    const promise = apiGet('/public/services/missing', itemSchema, ['services'])

    // Assert
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'No such service', status: 404 })
    expect(connection).not.toHaveBeenCalled()
  })

  it('normalises the code of any 404 ApiException to NOT_FOUND and keeps other statuses and codes', async () => {
    getService.mockRejectedValueOnce(new ApiException(404, 'GONE', 'Unpublished'))
    getFairs.mockRejectedValueOnce(badRequest('BAD_QUERY', 'Nope'))

    await expect(apiGet('/public/services/x', itemSchema, [])).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
    await expect(apiGet('/public/fairs', itemSchema, [])).rejects.toMatchObject({ name: 'ApiError', code: 'BAD_QUERY', message: 'Nope', status: 400 })
  })

  it('defers to request time (connection) and throws a NETWORK ApiError when the loader fails unexpectedly', async () => {
    // Arrange
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    getFairs.mockRejectedValue(new Error('connect ECONNREFUSED'))

    // Act
    const promise = apiGet('/public/fairs', itemSchema, ['fairs'])

    // Assert: during a build prerender connection() bails the route out to dynamic instead of failing the build
    await expect(promise).rejects.toMatchObject({ name: 'ApiError', code: 'NETWORK', status: 0 })
    expect(connection).toHaveBeenCalledTimes(1)
    // ...and the failure is logged first, so a build against an unreachable database is not silently all-dynamic
    expect(warn).toHaveBeenCalledWith('[web] GET /public/fairs failed: connect ECONNREFUSED')
    expect(warn.mock.invocationCallOrder[0]).toBeLessThan(connection.mock.invocationCallOrder[0] ?? 0)
  })

  it('throws INVALID_RESPONSE when the data does not match the schema', async () => {
    getFairs.mockResolvedValue({ slug: 1 })

    await expect(apiGet('/public/fairs', itemSchema, [])).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 })
  })

  it('rejects an unknown path with NOT_FOUND before touching the cache', async () => {
    await expect(apiGet('/public/nope', itemSchema, [])).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
    expect(unstableCache).not.toHaveBeenCalled()
  })
})

describe('apiGetUncached', () => {
  it('runs the loader without the data cache', async () => {
    search.mockResolvedValue({ slug: 'a', count: 1 })

    const result = await apiGetUncached('/public/search?q=a', itemSchema)

    expect(result).toEqual({ slug: 'a', count: 1 })
    expect(search).toHaveBeenCalledWith('a')
    expect(unstableCache).not.toHaveBeenCalled()
  })

  it('maps loader failures the same way as apiGet', async () => {
    search.mockRejectedValue(notFound())

    await expect(apiGetUncached('/public/search?q=a', itemSchema)).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })
})
