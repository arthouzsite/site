import { connection } from 'next/server'
import type { ZodType } from 'zod'

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

type Envelope = { ok?: unknown; data?: unknown; error?: { code?: unknown; message?: unknown } | null }

function apiBaseUrl(): string {
  const url = process.env.API_URL
  if (!url) throw new ApiError('CONFIG', 'API_URL is not set', 0)
  return url.replace(/\/$/, '')
}

async function readEnvelope(response: Response, path: string): Promise<Envelope> {
  try {
    return (await response.json()) as Envelope
  } catch {
    throw new ApiError('INVALID_RESPONSE', `GET ${path} returned a non-JSON body`, response.status)
  }
}

/**
 * Fetches, turning a network failure into `ApiError('NETWORK')`. `connection()` first defers the render to
 * request time: during `next build` the route is excluded from prerendering instead of failing the build
 * (or caching an error), and at request time it resolves immediately so the error reaches the error boundary.
 */
async function request(path: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${apiBaseUrl()}${path}`, init)
  } catch (error) {
    if (error instanceof ApiError) throw error
    const detail = error instanceof Error ? error.message : String(error)
    // Logged before deferring: otherwise a build against an unreachable API silently ships every route dynamic.
    console.warn(`[web] GET ${path} failed: ${detail}`)
    await connection()
    throw new ApiError('NETWORK', `GET ${path} failed: ${detail}`, 0)
  }
}

async function unwrap<T>(response: Response, path: string, schema: ZodType<T>): Promise<T> {
  const body = await readEnvelope(response, path)
  if (!response.ok || body.ok !== true) {
    const code = typeof body.error?.code === 'string' ? body.error.code : 'HTTP_ERROR'
    const message = typeof body.error?.message === 'string' ? body.error.message : `GET ${path} failed with HTTP ${response.status}`
    throw new ApiError(code, message, response.status)
  }
  const parsed = schema.safeParse(body.data)
  if (!parsed.success) {
    throw new ApiError('INVALID_RESPONSE', `GET ${path} returned data that does not match the contract: ${parsed.error.message}`, response.status)
  }
  return parsed.data
}

/** GETs an API path, unwraps the `{ ok, data, error }` envelope and validates `data` with `schema`. */
export async function apiGet<T>(path: string, schema: ZodType<T>, tags: string[]): Promise<T> {
  const response = await request(path, { next: { tags } })
  return unwrap(response, path, schema)
}

/** As `apiGet`, but never cached (per-keystroke search). */
export async function apiGetUncached<T>(path: string, schema: ZodType<T>): Promise<T> {
  const response = await request(path, { cache: 'no-store' })
  return unwrap(response, path, schema)
}
