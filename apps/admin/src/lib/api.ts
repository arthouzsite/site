import type { ApiEnvelope, ApiError as ApiErrorBody } from '@arthouz/shared'

export const SESSION_EXPIRED_EVENT = 'session-expired'
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly details?: unknown

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields
    this.details = body.details
  }
}

const NETWORK_ERROR: ApiErrorBody = { code: 'NETWORK_ERROR', message: 'Could not reach the server. Check your connection and try again.' }

function notifySessionExpired(status: number, path: string): void {
  if (status === 401 && !path.startsWith('/auth/')) {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
  }
}

function parseBody<T>(text: string): ApiEnvelope<T> | null {
  if (!text) return null
  try {
    return JSON.parse(text) as ApiEnvelope<T>
  } catch {
    return null
  }
}

export type ApiMeta = { total: number; page: number; limit: number }
export type ApiResult<T> = { data: T; meta?: ApiMeta }

function settleResult<T>(status: number, path: string, text: string): ApiResult<T> {
  const env = parseBody<T>(text)
  if (status >= 200 && status < 300 && env?.ok !== false) {
    return { data: (env?.data ?? null) as T, meta: (env as { meta?: ApiMeta } | null)?.meta }
  }
  notifySessionExpired(status, path)
  throw new ApiError(status, env?.error ?? { code: 'HTTP_ERROR', message: `Request failed (${status})` })
}

function settle<T>(status: number, path: string, text: string): T {
  return settleResult<T>(status, path, text).data
}

async function send<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, NETWORK_ERROR)
  }
  return settleResult<T>(res.status, path, await res.text())
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return (await send<T>(method, path, body)).data
}

function upload<T>(path: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_URL}${path}`)
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onerror = () => reject(new ApiError(0, NETWORK_ERROR))
    xhr.onload = () => {
      try {
        resolve(settle<T>(xhr.status, path, xhr.responseText))
      } catch (err) {
        reject(err)
      }
    }
    xhr.send(form)
  })
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  getWithMeta: <T>(path: string) => send<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
  upload,
}
