import { afterEach, describe, expect, it, vi } from 'vitest'

const apiGet = vi.fn()
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  apiGet: (...args: unknown[]) => apiGet(...args),
}))

import { ApiError } from '@/lib/api'
import { SITE_TAGLINE, loadFooterData } from '@/lib/footer-data'

afterEach(() => {
  apiGet.mockReset()
  vi.restoreAllMocks()
})

describe('loadFooterData', () => {
  it('returns settings and locations from the API', async () => {
    apiGet.mockImplementation(async (path: string) =>
      path === '/public/settings'
        ? { footer: { tagline: 'Tag', copyrightFrom: 2012, instagramUrl: 'https://i.example', facebookUrl: '' } }
        : [{ id: 'l1', city: 'Chennai' }],
    )

    const data = await loadFooterData()

    expect(data).toMatchObject({ tagline: 'Tag', copyrightFrom: 2012, instagramUrl: 'https://i.example', facebookUrl: null, degraded: false })
    expect(data.locations).toHaveLength(1)
  })

  it.each([
    ['a network failure', new TypeError('fetch failed'), 'fetch failed'],
    ['an ApiError', new ApiError('INTERNAL', 'Database unavailable', 500), 'Database unavailable'],
  ])('logs and falls back to static defaults on %s', async (_label, error, logged) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    apiGet.mockRejectedValue(error)

    const data = await loadFooterData()

    expect(data).toEqual({ tagline: SITE_TAGLINE, copyrightFrom: 2026, instagramUrl: null, facebookUrl: null, locations: [], degraded: true })
    expect(log).toHaveBeenCalledWith(expect.stringContaining(logged))
  })
})
