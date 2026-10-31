import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

// Next installs this global in its own server runtime before any cache code loads.
await vi.hoisted(async () => {
  const { AsyncLocalStorage } = await import('node:async_hooks')
  ;(globalThis as typeof globalThis & { AsyncLocalStorage?: unknown }).AsyncLocalStorage ??= AsyncLocalStorage
})

const getFairs = vi.fn()
vi.mock('@/lib/server/public/public-reads', () => ({ publicReads: { getFairs: () => getFairs() } }))
vi.mock('next/server', () => ({ connection: async () => undefined }))

// The real `unstable_cache`, backed by an in-memory stand-in for Next's incremental cache.
import { apiGet } from '@/lib/api'

type CacheGlobal = typeof globalThis & { __incrementalCache?: unknown }
const fairsSchema = z.array(z.object({ slug: z.string() }))
const entries = new Map<string, unknown>()

beforeAll(() => {
  ;(globalThis as CacheGlobal).__incrementalCache = {
    isOnDemandRevalidate: false,
    generateSimpleCacheKey: async (key: string) => key,
    get: async (key: string) => (entries.has(key) ? { value: entries.get(key), isStale: false } : null),
    set: async (key: string, value: unknown) => {
      entries.set(key, value)
    },
  }
})

afterAll(() => {
  delete (globalThis as CacheGlobal).__incrementalCache
})

describe('apiGet with the real unstable_cache', () => {
  it('never caches a failed read, then serves the first successful read from the cache', async () => {
    // Arrange
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    getFairs.mockRejectedValueOnce(new Error('database down')).mockResolvedValue([{ slug: 'india-art-fair' }])

    // Act
    const failed = apiGet('/public/fairs', fairsSchema, ['fairs'])
    await expect(failed).rejects.toMatchObject({ code: 'NETWORK' })
    const sizeAfterFailure = entries.size
    const first = await apiGet('/public/fairs', fairsSchema, ['fairs'])
    const second = await apiGet('/public/fairs', fairsSchema, ['fairs'])

    // Assert
    expect(sizeAfterFailure).toBe(0)
    expect(first).toEqual([{ slug: 'india-art-fair' }])
    expect(second).toEqual(first)
    expect(getFairs).toHaveBeenCalledTimes(2)
    expect(entries.size).toBe(1)
  })
})
