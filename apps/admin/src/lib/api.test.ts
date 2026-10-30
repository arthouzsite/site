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

describe('api.upload', () => {
  it('posts form data with credentials, reports progress and unwraps the envelope', async () => {
    server.use(http.post(`${API_URL}/media`, () => HttpResponse.json(envelope({ id: 'm1' }))))
    const fractions: number[] = []
    const form = new FormData()
    form.append('file', new File(['hello'], 'a.txt'))
    await expect(api.upload<{ id: string }>('/media', form, (f) => fractions.push(f))).resolves.toEqual({ id: 'm1' })
    fractions.forEach((f) => expect(f).toBeGreaterThanOrEqual(0))
  })

  it('rejects with ApiError on a server error', async () => {
    server.use(http.post(`${API_URL}/media`, () => HttpResponse.json(errorEnvelope('UNSUPPORTED_MEDIA', 'Not an image'), { status: 415 })))
    await expect(api.upload('/media', new FormData())).rejects.toMatchObject({ status: 415, code: 'UNSUPPORTED_MEDIA' })
  })

  it('rejects with NETWORK_ERROR when the request fails', async () => {
    server.use(http.post(`${API_URL}/media`, () => HttpResponse.error()))
    await expect(api.upload('/media', new FormData())).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('falls back to a generic error for a non-JSON failure body', async () => {
    server.use(http.get(`${API_URL}/bad`, () => new HttpResponse('<html>', { status: 502 })))
    await expect(api.get('/bad')).rejects.toMatchObject({ status: 502, code: 'HTTP_ERROR' })
  })
})
