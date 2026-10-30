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

/** GETs an API path, unwraps the `{ ok, data, error }` envelope and validates `data` with `schema`. */
export async function apiGet<T>(path: string, schema: ZodType<T>, tags: string[]): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, { next: { tags } })
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
