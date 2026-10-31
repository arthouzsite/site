import { expect } from 'vitest'
import { z, type ZodType } from 'zod'
import { call } from './client'

export const PUBLIC_CACHE_CONTROL = 'public, max-age=0, s-maxage=60'

export const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`)

export function arrayOf<T>(item: ZodType<T>): ZodType<T[]> {
  return z.array(item) as unknown as ZodType<T[]>
}

/** GETs a public route, asserts 200 plus the CDN cache header, and returns the schema-parsed `data`. */
export async function ok<T>(path: string, schema: ZodType<T>): Promise<T> {
  const res = await call('GET', path)
  expect(res.status).toBe(200)
  expect(res.headers.get('cache-control')).toBe(PUBLIC_CACHE_CONTROL)
  return schema.parse(res.body.data)
}
