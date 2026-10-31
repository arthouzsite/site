import type { ZodType } from 'zod'
import { badRequest } from './errors'

const NOT_AN_OBJECT = 'Body must be a JSON object'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads the JSON body and validates it; schema failures surface as a ZodError (mapped to 400 VALIDATION). */
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const raw: unknown = await request.json().catch(() => undefined)
  if (!isPlainObject(raw)) throw badRequest('BAD_REQUEST', NOT_AN_OBJECT)
  return schema.parse(raw)
}

/** Search params as a flat record; a repeated key keeps its last value. */
export function queryRecord(url: URL): Record<string, string> {
  return Object.fromEntries(url.searchParams)
}

export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
  return schema.parse(queryRecord(url))
}
