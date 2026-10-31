import { resolveRoute } from './resolve'

export const SESSION_COOKIE_NAME = 'ah_session'

export type CallInit = {
  body?: unknown
  form?: FormData
  /** The raw Cookie request header, e.g. `ah_session=<token>`. */
  cookie?: string
  headers?: Record<string, string>
}

export type CallResult = {
  status: number
  // Parsed JSON, or null when the response has no JSON body; typed any so specs can index freely.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  headers: Headers
}

const NOT_FOUND_BODY = { ok: false, data: null, error: { code: 'NOT_FOUND', message: 'Route not found' } }
const METHOD_NOT_ALLOWED_BODY = { ok: false, data: null, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }

function buildRequest(method: string, path: string, init: CallInit): Request {
  const headers = new Headers(init.headers)
  if (init.cookie) headers.set('cookie', init.cookie)
  let body: BodyInit | undefined
  if (init.form) {
    body = init.form
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body)
    if (!headers.has('content-type')) headers.set('content-type', 'application/json')
  }
  return new Request(`http://localhost${path}`, { method: method.toUpperCase(), headers, body })
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function jsonResult(status: number, body: unknown): CallResult {
  return { status, body, headers: new Headers({ 'content-type': 'application/json' }) }
}

/** Calls the route handler for (method, path) in-process, the way Next would, and returns the parsed response. */
export async function call(method: string, path: string, init: CallInit = {}): Promise<CallResult> {
  const resolved = await resolveRoute(method, new URL(`http://localhost${path}`).pathname)
  if (!resolved) return jsonResult(404, NOT_FOUND_BODY)
  if (!resolved.handler) return jsonResult(405, METHOD_NOT_ALLOWED_BODY)
  const response = await resolved.handler(buildRequest(method, path, init), { params: Promise.resolve(resolved.params) })
  return { status: response.status, body: await readBody(response), headers: response.headers }
}

/** Cookie-authenticated shortcuts; `getCookie` returns the ah_session token value (as `loginAs` does). */
export function authedClient(getCookie: () => string) {
  const send = (method: string, path: string, body?: unknown) =>
    call(method, path, { cookie: `${SESSION_COOKIE_NAME}=${getCookie()}`, ...(body === undefined ? {} : { body }) })
  return {
    get: (path: string) => send('GET', path),
    post: (path: string, body?: unknown) => send('POST', path, body),
    put: (path: string, body?: unknown) => send('PUT', path, body),
    patch: (path: string, body?: unknown) => send('PATCH', path, body),
    del: (path: string, body?: unknown) => send('DELETE', path, body),
  }
}
