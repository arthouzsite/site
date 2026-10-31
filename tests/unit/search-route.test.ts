import { beforeEach, describe, expect, it, vi } from 'vitest'

const search = vi.fn()
vi.mock('@/lib/server/public/public-reads', () => ({ publicReads: { search: (q: string) => search(q) } }))
vi.mock('next/server', () => ({ connection: async () => undefined }))

import { GET } from '@/app/api/search/route'

const GROUPS = [{ label: 'Artists', items: [{ label: 'Vijay Pichumani', href: '/artists/vijay-pichumani' }] }]

function request(query: string): Request {
  return new Request(`http://web.test/api/search${query}`)
}

describe('GET /api/search', () => {
  beforeEach(() => {
    search.mockReset()
  })

  it('rejects a query longer than 120 characters with 400 and does not search', async () => {
    const response = await GET(request(`?q=${'a'.repeat(121)}`))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, data: null, error: { code: 'VALIDATION_ERROR' } })
    expect(search).not.toHaveBeenCalled()
  })

  it('returns no groups for a blank query without searching', async () => {
    const response = await GET(request('?q=%20%20'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ groups: [] })
    expect(search).not.toHaveBeenCalled()
  })

  it('searches the trimmed query and returns the groups uncached', async () => {
    search.mockResolvedValue({ groups: GROUPS })

    const response = await GET(request('?q=%20pich%20'))

    expect(search).toHaveBeenCalledExactlyOnceWith('pich')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ groups: GROUPS })
  })

  it('passes reserved characters through to the search intact', async () => {
    search.mockResolvedValue({ groups: [] })

    await GET(request(`?q=${encodeURIComponent('a&b=c')}`))

    expect(search).toHaveBeenCalledWith('a&b=c')
  })

  it('answers 502 (and logs) when the search fails or returns data outside the contract', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    search.mockResolvedValueOnce({ groups: [{ label: 'Fairs', items: [] }] })
    const invalid = await GET(request('?q=pich'))
    search.mockRejectedValueOnce(new Error('database down'))
    const down = await GET(request('?q=pich'))

    expect(invalid.status).toBe(502)
    expect(down.status).toBe(502)
    expect(down.headers.get('cache-control')).toBe('no-store')
    expect(await down.json()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_ERROR' } })
    expect(log).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })
})
