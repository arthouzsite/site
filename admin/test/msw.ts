import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

export const API_URL = 'http://localhost/api'

export const envelope = <T,>(data: T) => ({ ok: true, data, error: null })
export const errorEnvelope = (code: string, message: string, fields?: Record<string, string>) => ({
  ok: false,
  data: null,
  error: fields ? { code, message, fields } : { code, message },
})

export const server = setupServer(
  http.get(`${API_URL}/auth/me`, () =>
    HttpResponse.json(errorEnvelope('UNAUTHENTICATED', 'Not signed in'), { status: 401 }),
  ),
  http.get(`${API_URL}/auth/captcha`, () => HttpResponse.json(envelope({ token: 'captcha-token', image: '<svg xmlns="http://www.w3.org/2000/svg"/>' }))),
)

export { http, HttpResponse }
