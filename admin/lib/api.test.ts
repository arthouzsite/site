import { describe, expect, it, vi } from 'vitest'
import { api, ApiError, SESSION_EXPIRED_EVENT } from './api'
import { API_URL, HttpResponse, errorEnvelope, envelope, http, server } from '../test/msw'

describe('api', () => {
  it('throws ApiError with fields on 400', async () => {
    server.use(
      http.post(`${API_URL}/exhibitions`, () =>
        HttpResponse.json(errorEnvelope('VALIDATION_ERROR', 'Check the form', { title: 'Required' }), { status: 400 }),
      ),
    )
    const err = await api.post('/exhibitions', {}).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', message: 'Check the form', fields: { title: 'Required' } })
  })

  it('unwraps the envelope data and sends credentials', async () => {
    let credentials = ''
    server.use(
      http.get(`${API_URL}/things`, ({ request }) => {
        credentials = request.credentials
        return HttpResponse.json(envelope({ a: 1 }))
      }),
    )
    await expect(api.get<{ a: number }>('/things')).resolves.toEqual({ a: 1 })
    expect(credentials).toBe('include')
  })

  it('dispatches session-expired on a 401 outside /auth', async () => {
    server.use(http.get(`${API_URL}/things`, () => HttpResponse.json(errorEnvelope('UNAUTHENTICATED', 'No'), { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    await expect(api.get('/things')).rejects.toBeInstanceOf(ApiError)
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('does not dispatch session-expired for /auth calls', async () => {
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    await expect(api.get('/auth/me')).rejects.toMatchObject({ status: 401 })
    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('wraps a network failure in ApiError', async () => {
    server.use(http.get(`${API_URL}/things`, () => HttpResponse.error()))
    await expect(api.get('/things')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('getWithMeta returns data and meta', async () => {
    server.use(http.get(`${API_URL}/list`, () => HttpResponse.json({ ...envelope([1, 2]), meta: { total: 9, page: 1, limit: 2 } })))
    await expect(api.getWithMeta<number[]>('/list')).resolves.toEqual({ data: [1, 2], meta: { total: 9, page: 1, limit: 2 } })
  })

  it('getWithMeta dispatches session-expired on 401', async () => {
    server.use(http.get(`${API_URL}/list`, () => HttpResponse.json(errorEnvelope('UNAUTHENTICATED', 'No'), { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    await expect(api.getWithMeta('/list')).rejects.toMatchObject({ status: 401 })
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
  })

  it('getWithMeta wraps a network failure', async () => {
    server.use(http.get(`${API_URL}/list`, () => HttpResponse.error()))
    await expect(api.getWithMeta('/list')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('supports put, patch and delete with JSON bodies', async () => {
    const seen: string[] = []
    for (const m of ['put', 'patch', 'delete'] as const) {
      server.use(
        http[m](`${API_URL}/x`, async ({ request }) => {
          seen.push(`${request.method}:${request.headers.get('content-type') ?? ''}`)
          return HttpResponse.json(envelope(null))
        }),
      )
    }
    await api.put('/x', { a: 1 })
    await api.patch('/x', { a: 1 })
    await api.delete('/x')
    expect(seen).toEqual(['PUT:application/json', 'PATCH:application/json', 'DELETE:'])
  })
})

describe('api.putRaw', () => {
  const STORAGE = 'https://bucket.r2.example'
  const blob = () => new Blob(['hello'], { type: 'image/jpeg' })

  it('sends the raw bytes and headers to an absolute URL without credentials', async () => {
    const seen: Array<{ credentials: string; contentType: string | null; cookie: string | null; text: string }> = []
    server.use(
      http.put(`${STORAGE}/arthouz/a.jpg`, async ({ request }) => {
        seen.push({
          credentials: request.credentials,
          contentType: request.headers.get('content-type'),
          cookie: request.headers.get('cookie'),
          text: await request.text(),
        })
        return new HttpResponse(null, { status: 200 })
      }),
    )
    await expect(api.putRaw(`${STORAGE}/arthouz/a.jpg`, blob(), { 'content-type': 'image/jpeg' })).resolves.toBeUndefined()
    expect(seen).toEqual([{ credentials: 'same-origin', contentType: 'image/jpeg', cookie: null, text: 'hello' }])
  })

  it('sends credentials to a same-origin URL, relative or absolute', async () => {
    const credentials: string[] = []
    server.use(
      http.put(`${API_URL}/media/uploads/*`, ({ request }) => {
        credentials.push(request.credentials)
        return new HttpResponse(null, { status: 200 })
      }),
    )
    await api.putRaw('/api/media/uploads/arthouz/a.jpg', blob(), { 'content-type': 'image/jpeg' })
    await api.putRaw(`${window.location.origin}/api/media/uploads/arthouz/b.jpg`, blob(), { 'content-type': 'image/jpeg' })
    expect(credentials).toEqual(['include', 'include'])
  })

  it('reports progress as fractions', async () => {
    server.use(http.put(`${STORAGE}/p`, () => new HttpResponse(null, { status: 200 })))
    const fractions: number[] = []
    await api.putRaw(`${STORAGE}/p`, blob(), {}, (f) => fractions.push(f))
    fractions.forEach((f) => {
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
    })
  })

  it('rejects with UPLOAD_BLOCKED naming the storage origin when the request fails', async () => {
    server.use(http.put(`${STORAGE}/x`, () => HttpResponse.error()))
    await expect(api.putRaw(`${STORAGE}/x`, blob(), {})).rejects.toMatchObject({
      status: 0,
      code: 'UPLOAD_BLOCKED',
      message: `The storage at ${STORAGE} refused the upload. Check the bucket CORS rule.`,
    })
  })

  it('rejects with UPLOAD_FAILED and the status for a non-2xx answer', async () => {
    server.use(http.put(`${STORAGE}/x`, () => new HttpResponse(null, { status: 403 })))
    await expect(api.putRaw(`${STORAGE}/x`, blob(), {})).rejects.toMatchObject({ status: 403, code: 'UPLOAD_FAILED', message: 'Storage returned 403' })
  })

  it('announces an expired session when our own origin answers 401', async () => {
    server.use(http.put(`${API_URL}/media/uploads/*`, () => new HttpResponse(null, { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    await expect(api.putRaw('/api/media/uploads/arthouz/a.jpg', blob(), {})).rejects.toMatchObject({ status: 401, code: 'UPLOAD_FAILED' })
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not treat a storage 401 as a CMS session expiry', async () => {
    server.use(http.put(`${STORAGE}/x`, () => new HttpResponse(null, { status: 401 })))
    const listener = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, listener)
    await expect(api.putRaw(`${STORAGE}/x`, blob(), {})).rejects.toMatchObject({ status: 401 })
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
    expect(listener).not.toHaveBeenCalled()
  })

  it('falls back to a generic error for a non-JSON failure body', async () => {
    server.use(http.get(`${API_URL}/bad`, () => new HttpResponse('<html>', { status: 502 })))
    await expect(api.get('/bad')).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' })
  })
})
