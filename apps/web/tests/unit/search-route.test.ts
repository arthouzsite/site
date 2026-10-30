import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/search/route'

const API = 'http://api.test'
const GROUPS = [{ label: 'Artists', items: [{ label: 'Vijay Pichumani', href: '/artists/vijay-pichumani' }] }]

function request(query: string): Request {
  return new Request(`http://web.test/api/search${query}`)
}

function envelope(data: unknown, init: ResponseInit = {}): Response {
  return Response.json({ ok: true, data, error: null }, init)
}

describe('GET /api/search', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv('API_URL', API)
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('rejects a query longer than 120 characters with 400 and does not call the API', async () => {
    const response = await GET(request(`?q=${'a'.repeat(121)}`))

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false, data: null, error: { code: 'VALIDATION_ERROR' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns no groups for a blank query without calling the API', async () => {
    const response = await GET(request('?q=%20%20'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ groups: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('proxies the trimmed query to /public/search and returns the envelope data uncached', async () => {
    fetchMock.mockResolvedValue(envelope({ groups: GROUPS }))

    const response = await GET(request('?q=%20pich%20'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${API}/public/search?q=pich`)
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ groups: GROUPS })
  })

  it('encodes reserved characters in the proxied query', async () => {
    fetchMock.mockResolvedValue(envelope({ groups: [] }))

    await GET(request(`?q=${encodeURIComponent('a&b=c')}`))

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${API}/public/search?q=a%26b%3Dc`)
  })

  it('answers 502 (and logs) when the API fails or returns a body outside the contract', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fetchMock.mockResolvedValueOnce(envelope({ groups: [{ label: 'Fairs', items: [] }] }))
    const invalid = await GET(request('?q=pich'))
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    const down = await GET(request('?q=pich'))

    expect(invalid.status).toBe(502)
    expect(down.status).toBe(502)
    expect(down.headers.get('cache-control')).toBe('no-store')
    expect(await down.json()).toMatchObject({ ok: false, error: { code: 'UPSTREAM_ERROR' } })
    expect(log).toHaveBeenCalledTimes(2)
    log.mockRestore()
  })
})
