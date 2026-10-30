import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'

describe('health and envelope', () => {
  let app: INestApplication

  beforeAll(async () => {
    migrateTestDb()
    await resetDb()
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /health returns the envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)
    expect(res.body).toEqual({ ok: true, data: { status: 'ok' }, error: null })
  })

  it('unknown route returns a 404 envelope', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404)
    expect(res.body.ok).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
