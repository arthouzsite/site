import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { signSession } from '@/lib/server/auth/session'
import { prisma } from '@/lib/server/prisma'
import { badRequest } from './errors'
import { route, withMeta } from './route'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))
vi.mock('@/lib/server/prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }))

const findUnique = vi.mocked(prisma.user.findUnique) as unknown as ReturnType<typeof vi.fn>

const ADMIN = { id: 'u-admin', email: 'a@example.test', name: 'Ada', role: 'ADMIN', isDisabled: false }
const EDITOR = { id: 'u-editor', email: 'e@example.test', name: 'Ed', role: 'EDITOR', isDisabled: false }

async function request(method: string, init: { headers?: Record<string, string>; user?: typeof ADMIN } = {}): Promise<Request> {
  const headers: Record<string, string> = { ...init.headers }
  if (init.user) headers.cookie = `ah_session=${await signSession(init.user.id)}`
  return new Request('http://localhost/api/things/7?x=1', { method, headers })
}

const noParams = { params: Promise.resolve({}) }
const emptyBody = (response: Response) => response.json() as Promise<Record<string, unknown>>

beforeEach(() => {
  findUnique.mockReset()
})

describe('route: origin check', () => {
  const handler = route('public', () => 'done')

  it('rejects a mutating request from another origin with 403 BAD_ORIGIN', async () => {
    const response = await handler(await request('POST', { headers: { origin: 'http://evil.example' } }), noParams)
    expect(response.status).toBe(403)
    expect(await emptyBody(response)).toMatchObject({ ok: false, error: { code: 'BAD_ORIGIN' } })
  })

  it.each(['PUT', 'PATCH', 'DELETE'])('also checks %s', async (method) => {
    const response = await handler(await request(method, { headers: { origin: 'http://evil.example' } }), noParams)
    expect(response.status).toBe(403)
  })

  it('allows a mutating request with no Origin header', async () => {
    expect((await handler(await request('POST'), noParams)).status).toBe(200)
  })

  it('allows a mutating request from the same origin', async () => {
    expect((await handler(await request('POST', { headers: { origin: 'http://localhost' } }), noParams)).status).toBe(200)
  })

  it('does not check the origin of a GET', async () => {
    expect((await handler(await request('GET', { headers: { origin: 'http://evil.example' } }), noParams)).status).toBe(200)
  })
})

describe('route: authentication', () => {
  it('returns 401 UNAUTHORIZED for auth=user without a cookie', async () => {
    const response = await route('user', () => 'secret')(await request('GET'), noParams)
    expect(response.status).toBe(401)
    expect(await emptyBody(response)).toMatchObject({ error: { code: 'UNAUTHORIZED', message: 'Please sign in again' } })
  })

  it('returns 403 FORBIDDEN for auth=admin with an EDITOR', async () => {
    findUnique.mockResolvedValue(EDITOR)
    const response = await route('admin', () => 'secret')(await request('GET', { user: EDITOR as typeof ADMIN }), noParams)
    expect(response.status).toBe(403)
    expect(await emptyBody(response)).toMatchObject({ error: { code: 'FORBIDDEN' } })
  })

  it('lets an EDITOR through auth=user and an ADMIN through auth=admin', async () => {
    findUnique.mockResolvedValue(EDITOR)
    expect((await route('user', () => 1)(await request('GET', { user: EDITOR as typeof ADMIN }), noParams)).status).toBe(200)
    findUnique.mockResolvedValue(ADMIN)
    expect((await route('admin', () => 1)(await request('GET', { user: ADMIN }), noParams)).status).toBe(200)
  })

  it('gives public handlers the signed-in user when there is one, null otherwise', async () => {
    findUnique.mockResolvedValue(ADMIN)
    const handler = route('public', ({ user }) => ({ role: user?.role ?? null }))
    expect(await emptyBody(await handler(await request('GET', { user: ADMIN }), noParams))).toMatchObject({ data: { role: 'ADMIN' } })
    expect(await emptyBody(await handler(await request('GET'), noParams))).toMatchObject({ data: { role: null } })
  })

  it('never exposes the password hash or disabled flag', async () => {
    findUnique.mockResolvedValue(ADMIN)
    const response = await route('user', ({ user }) => user)(await request('GET', { user: ADMIN }), noParams)
    expect((await emptyBody(response)).data).toEqual({ id: 'u-admin', email: 'a@example.test', name: 'Ada', role: 'ADMIN' })
  })
})

describe('route: context and responses', () => {
  it('resolves params, the url and the request for the handler', async () => {
    const seen: unknown[] = []
    const handler = route<{ id: string }>('public', ({ params, url, request: req }) => {
      seen.push(params, url.searchParams.get('x'), req.method)
      return null
    })
    await handler(await request('GET'), { params: Promise.resolve({ id: '7' }) })
    expect(seen).toEqual([{ id: '7' }, '1', 'GET'])
  })

  it('wraps a plain return in the ok envelope and withMeta in ok(data, meta)', async () => {
    const plain = await route('public', () => ({ a: 1 }))(await request('GET'), noParams)
    expect(plain.status).toBe(200)
    expect(await emptyBody(plain)).toEqual({ ok: true, data: { a: 1 }, error: null })

    const meta = { total: 3, page: 1, limit: 50 }
    const paged = await route('public', () => withMeta([1, 2, 3], meta))(await request('GET'), noParams)
    expect(await emptyBody(paged)).toEqual({ ok: true, data: [1, 2, 3], error: null, meta })
  })

  it('wraps undefined as null data and honours options.status', async () => {
    const response = await route('public', () => undefined, { status: 201 })(await request('GET'), noParams)
    expect(response.status).toBe(201)
    expect(await emptyBody(response)).toEqual({ ok: true, data: null, error: null })
  })

  it('passes through a Response returned by the handler (cookies intact)', async () => {
    const handler = route('public', () => Response.json({ custom: true }, { status: 202, headers: { 'set-cookie': 'a=b; Path=/' } }))
    const response = await handler(await request('GET'), noParams)
    expect(response.status).toBe(202)
    expect(response.headers.get('set-cookie')).toBe('a=b; Path=/')
    expect(await response.json()).toEqual({ custom: true })
  })

  it('awaits async handlers', async () => {
    const response = await route('public', async () => Promise.resolve('later'))(await request('GET'), noParams)
    expect(await emptyBody(response)).toMatchObject({ data: 'later' })
  })
})

describe('route: errors', () => {
  it('maps a thrown ApiException through mapError', async () => {
    const response = await route('public', () => {
      throw badRequest('NOPE', 'No')
    })(await request('GET'), noParams)
    expect(response.status).toBe(400)
    expect(await emptyBody(response)).toEqual({ ok: false, data: null, error: { code: 'NOPE', message: 'No' } })
  })

  it('maps a ZodError to 400 VALIDATION', async () => {
    const response = await route('public', () => z.object({ n: z.number() }).parse({ n: 'x' }))(await request('GET'), noParams)
    expect(response.status).toBe(400)
    expect(await emptyBody(response)).toMatchObject({ error: { code: 'VALIDATION', fields: { n: expect.any(String) } } })
  })

  it('maps an unexpected error to 500 INTERNAL', async () => {
    const response = await route('public', () => {
      throw new Error('boom')
    })(await request('GET'), noParams)
    expect(response.status).toBe(500)
    expect(await emptyBody(response)).toMatchObject({ error: { code: 'INTERNAL' } })
  })
})
