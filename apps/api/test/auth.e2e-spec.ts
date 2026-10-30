import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser, TEST_PASSWORD } from './helpers/users'

describe('auth', () => {
  let app: INestApplication
  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
  })
  beforeEach(async () => {
    await resetDb()
    resetThrottle(app)
    await seedUser(app, { email: 'admin@example.test', role: 'ADMIN', name: 'Ada' })
  })
  afterAll(async () => {
    await app.close()
  })

  it('login sets ah_session cookie and returns user', async () => {
    const res = await http().post('/auth/login').send({ email: 'admin@example.test', password: TEST_PASSWORD }).expect(200)
    expect(res.body.data.user).toEqual({ id: expect.any(String), email: 'admin@example.test', name: 'Ada', role: 'ADMIN' })
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('ah_session='))
    expect(cookie).toBeDefined()
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\//)
    expect(cookie).toMatch(/Max-Age=604800/)
    expect(cookie).not.toMatch(/Secure/i)
  })

  it('wrong password -> 401 INVALID_CREDENTIALS', async () => {
    const res = await http().post('/auth/login').send({ email: 'admin@example.test', password: 'nope-nope-nope' }).expect(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('unknown email and disabled user give the same 401', async () => {
    await seedUser(app, { email: 'off@example.test', role: 'EDITOR', isDisabled: true })
    const unknown = await http().post('/auth/login').send({ email: 'x@example.test', password: TEST_PASSWORD }).expect(401)
    const disabled = await http().post('/auth/login').send({ email: 'off@example.test', password: TEST_PASSWORD }).expect(401)
    expect(unknown.body).toEqual(disabled.body)
    expect(disabled.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('invalid login body -> 400 VALIDATION', async () => {
    const res = await http().post('/auth/login').send({ email: 'bad' }).expect(400)
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('GET /auth/me without cookie -> 401', async () => {
    const res = await http().get('/auth/me').expect(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('GET /auth/me with cookie returns the user', async () => {
    const cookie = await loginAs(app, 'admin@example.test')
    const res = await http().get('/auth/me').set('Cookie', cookie).expect(200)
    expect(res.body.data).toEqual({ id: expect.any(String), email: 'admin@example.test', name: 'Ada', role: 'ADMIN' })
  })

  it('garbage cookie -> 401', async () => {
    await http().get('/auth/me').set('Cookie', 'ah_session=garbage').expect(401)
  })

  it('disabled user with a valid cookie is rejected', async () => {
    const cookie = await loginAs(app, 'admin@example.test')
    await app.get(PrismaService).user.updateMany({ data: { isDisabled: true } })
    await http().get('/auth/me').set('Cookie', cookie).expect(401)
  })

  it('logout clears the cookie', async () => {
    const cookie = await loginAs(app, 'admin@example.test')
    const res = await http().post('/auth/logout').set('Cookie', cookie).expect(200)
    const cleared = (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('ah_session='))
    expect(cleared).toMatch(/ah_session=;/)
  })

  it('GET /health works without a cookie', async () => {
    await http().get('/health').expect(200)
  })

  it('mutating request with foreign Origin -> 403 BAD_ORIGIN', async () => {
    const res = await http()
      .post('/auth/login')
      .set('Origin', 'http://evil.example')
      .send({ email: 'admin@example.test', password: TEST_PASSWORD })
      .expect(403)
    expect(res.body.error.code).toBe('BAD_ORIGIN')
  })

  it('mutating request with admin Origin passes', async () => {
    await http()
      .post('/auth/login')
      .set('Origin', process.env.ADMIN_ORIGIN ?? 'http://localhost:5180')
      .send({ email: 'admin@example.test', password: TEST_PASSWORD })
      .expect(200)
  })

  it('6th login attempt within a minute -> 429', async () => {
    for (let i = 0; i < 5; i += 1) {
      await http().post('/auth/login').send({ email: 'admin@example.test', password: 'wrong-wrong-wrong' }).expect(401)
    }
    const res = await http().post('/auth/login').send({ email: 'admin@example.test', password: 'wrong-wrong-wrong' }).expect(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })
})
