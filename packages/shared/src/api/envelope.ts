export type ApiError = { code: string; message: string; fields?: Record<string, string>; details?: unknown }
export type ApiMeta = { total: number; page: number; limit: number }
export type ApiEnvelope<T> = {
  ok: boolean
  data: T | null
  error: ApiError | null
  meta?: ApiMeta
}

export function ok<T>(data: T, meta?: ApiMeta): ApiEnvelope<T> {
  return meta ? { ok: true, data, error: null, meta } : { ok: true, data, error: null }
}

export function fail(code: string, message: string, fields?: Record<string, string>): ApiEnvelope<never> {
  return { ok: false, data: null, error: fields ? { code, message, fields } : { code, message } }
}
