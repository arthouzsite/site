import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'

describe('health and envelope', () => {
  beforeAll(async () => {
    migrateTestDb()
    await resetDb()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('GET /api/health returns the envelope', async () => {
    const res = await call('GET', '/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, data: { status: 'ok' }, error: null })
  })

  it('unknown route returns a 404 envelope from the catch-all route', async () => {
    const res = await call('GET', '/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ ok: false, data: null, error: { code: 'NOT_FOUND', message: 'No such endpoint' } })
  })

  it('unknown nested paths and mutating methods also get the 404 envelope', async () => {
    expect((await call('GET', '/api/health/deeper/still')).body.error.code).toBe('NOT_FOUND')
    const post = await call('POST', '/api/nope', { body: {} })
    expect(post.status).toBe(404)
    expect(post.body.error.code).toBe('NOT_FOUND')
  })

  it('literal routes win over the catch-all, and query strings pass through', async () => {
    const res = await call('GET', '/api/health?probe=1')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ status: 'ok' })
  })

  it('answers 405 for a method the route does not export', async () => {
    const res = await call('DELETE', '/api/health')
    expect(res.status).toBe(405)
    expect(res.body).toBeNull()
  })
})
