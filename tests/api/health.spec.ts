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

  it('unknown route returns a 404 envelope', async () => {
    const res = await call('GET', '/api/nope')
    expect(res.status).toBe(404)
    expect(res.body.ok).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('resolves a nested path and passes query strings through', async () => {
    expect((await call('GET', '/api/health?probe=1')).status).toBe(200)
  })

  it('answers 405 for a method the route does not export', async () => {
    const res = await call('DELETE', '/api/health')
    expect(res.status).toBe(405)
    expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED')
  })
})
