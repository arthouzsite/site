import { resolveRoute } from './resolve'

export const SESSION_COOKIE_NAME = 'ah_session'

export type CallInit = {
  body?: unknown
  form?: FormData
  /** A raw request body (bytes), sent as given; the caller sets the content-type header. */
  raw?: BodyInit
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

function buildRequest(method: string, path: string, init: CallInit): Request {
  const headers = new Headers(init.headers)
  if (init.cookie) headers.set('cookie', init.cookie)
  let body: BodyInit | undefined
  if (init.form) {
    body = init.form
  } else if (init.raw !== undefined) {
    body = init.raw
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

/** Calls the route handler for (method, path) in-process, the way Next would, and returns the parsed response. */
export async function call(method: string, path: string, init: CallInit = {}): Promise<CallResult> {
  const resolved = await resolveRoute(method, new URL(`http://localhost${path}`).pathname)
  // Unknown paths under /api reach app/api/[...path]; only a path outside /api can fail to resolve.
  if (!resolved) throw new Error(`call: ${path} is not under /api`)
  // Like Next: a known path without an export for the method is a bare 405.
  if (!resolved.handler) return { status: 405, body: null, headers: new Headers() }
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
