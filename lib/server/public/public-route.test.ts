import { describe, expect, it } from 'vitest'
import { notFound } from '@/lib/server/http/errors'
import { CACHE_CONTROL } from './public.constants'
import { publicRoute } from './public-route'

const context = { params: Promise.resolve({}) }
const request = () => new Request('http://localhost/api/public/x')

describe('publicRoute', () => {
  it('adds the CDN cache header and keeps the ok envelope', async () => {
    const res = await publicRoute(() => ({ hello: 'world' }))(request(), context)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe(CACHE_CONTROL)
    expect(await res.json()).toEqual({ ok: true, data: { hello: 'world' }, error: null })
  })

  it('sends null data when the handler returns nothing', async () => {
    const res = await publicRoute(() => undefined)(request(), context)
    expect((await res.json()).data).toBeNull()
  })

  it('passes the url and awaited params to the handler', async () => {
    const handler = publicRoute<{ slug: string }>(({ params, url }) => ({ slug: params.slug, path: url.pathname }))
    const res = await handler(request(), { params: Promise.resolve({ slug: 'a' }) })
    expect((await res.json()).data).toEqual({ slug: 'a', path: '/api/public/x' })
  })

  it('maps a thrown error to its envelope and never sets the cache header', async () => {
    const res = await publicRoute(() => {
      throw notFound('Not found')
    })(request(), context)
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBeNull()
    expect((await res.json()).error).toMatchObject({ code: 'NOT_FOUND', message: 'Not found' })
  })
})
