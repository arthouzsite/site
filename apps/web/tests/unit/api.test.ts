import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }))
const connection = vi.fn(async () => undefined)
vi.mock('next/server', () => ({ connection: () => connection() }))

import { ApiError, apiGet } from '@/lib/api'
import { POST } from '@/app/api/revalidate/route'

const API_URL = 'http://api.test'
const SECRET = 'unit-test-secret'
const itemSchema = z.object({ slug: z.string(), count: z.number() })

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function revalidateRequest(secret: string, body: unknown): Request {
  return new Request('http://web.test/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.stubEnv('API_URL', API_URL)
  vi.stubEnv('REVALIDATE_SECRET', SECRET)
  revalidateTag.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('apiGet', () => {
  it('defers to request time (connection) and throws a NETWORK ApiError when the API is unreachable', async () => {
    // Arrange
    connection.mockClear()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))))

    // Act
    const promise = apiGet('/public/fairs', itemSchema, ['fairs'])

    // Assert: during a build prerender connection() bails the route out to dynamic instead of failing the build
    await expect(promise).rejects.toMatchObject({ name: 'ApiError', code: 'NETWORK', status: 0 })
    expect(connection).toHaveBeenCalledTimes(1)
    // ...and the failure is logged first, so a build against an unreachable API is not silently all-dynamic
    expect(warn).toHaveBeenCalledWith('[web] GET /public/fairs failed: fetch failed')
    expect(warn.mock.invocationCallOrder[0]).toBeLessThan(connection.mock.invocationCallOrder[0] ?? 0)
    warn.mockRestore()
  })

  it('apiGet unwraps the envelope and parses with the schema', async () => {
    // Arrange
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true, data: { slug: 'tidewater', count: 3, extra: 'x' }, error: null }))
    vi.stubGlobal('fetch', fetchMock)

    // Act
    const result = await apiGet('/public/thing', itemSchema, ['home', 'exhibitions'])

    // Assert
    expect(result).toEqual({ slug: 'tidewater', count: 3 })
    expect(fetchMock).toHaveBeenCalledWith(`${API_URL}/public/thing`, { next: { tags: ['home', 'exhibitions'] } })
  })

  it('apiGet throws ApiError with code on ok:false', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'No such exhibition' } }, 404)))

    // Act
    const promise = apiGet('/public/exhibitions/missing', itemSchema, ['exhibitions'])

    // Assert
    await expect(promise).rejects.toBeInstanceOf(ApiError)
    await expect(promise).rejects.toMatchObject({ code: 'NOT_FOUND', message: 'No such exhibition', status: 404 })
  })

  it('apiGet throws ApiError when the payload does not match the schema', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ ok: true, data: { slug: 1 }, error: null })))

    await expect(apiGet('/public/thing', itemSchema, [])).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 })
  })
})

describe('POST /api/revalidate', () => {
  it('revalidate route rejects a bad secret with 401', async () => {
    // Act
    const response = await POST(revalidateRequest('wrong-secret', { tags: ['home'] }))

    // Assert
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } })
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('revalidates every tag with a valid secret', async () => {
    const response = await POST(revalidateRequest(SECRET, { tags: ['home', 'exhibition:tidewater'] }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, data: { revalidated: ['home', 'exhibition:tidewater'] }, error: null })
    expect(revalidateTag.mock.calls.map((call) => call[0])).toEqual(['home', 'exhibition:tidewater'])
  })

  it('rejects a malformed body with 400', async () => {
    const response = await POST(revalidateRequest(SECRET, { tags: 'home' }))

    expect(response.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
