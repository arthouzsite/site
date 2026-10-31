import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser, TEST_PASSWORD } from './helpers/users'

const login = (body: unknown, headers?: Record<string, string>) => call('POST', '/api/auth/login', { body, headers })

describe('auth', () => {
  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN', name: 'Ada' })
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('login sets ah_session cookie and returns user', async () => {
    const res = await login({ email: 'admin@example.test', password: TEST_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.data.user).toEqual({ id: expect.any(String), email: 'admin@example.test', name: 'Ada', role: 'ADMIN' })
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
    const cookie = res.headers.get('set-cookie')
    expect(cookie).toMatch(/^ah_session=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)
    expect(cookie).toMatch(/Path=\//)
    expect(cookie).toMatch(/Max-Age=604800/)
    expect(cookie).not.toMatch(/Secure/i)
  })

  it('wrong password -> 401 INVALID_CREDENTIALS', async () => {
    const res = await login({ email: 'admin@example.test', password: 'nope-nope-nope' })
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('unknown email and disabled user give the same 401', async () => {
    await seedUser({ email: 'off@example.test', role: 'EDITOR', isDisabled: true })
    const unknown = await login({ email: 'x@example.test', password: TEST_PASSWORD })
    const disabled = await login({ email: 'off@example.test', password: TEST_PASSWORD })
    expect(unknown.status).toBe(401)
    expect(disabled.status).toBe(401)
    expect(unknown.body).toEqual(disabled.body)
    expect(disabled.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('invalid login body -> 400 VALIDATION', async () => {
    const res = await login({ email: 'bad' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('GET /api/auth/me without cookie -> 401', async () => {
    const res = await call('GET', '/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })

  it('GET /api/auth/me with cookie returns the user', async () => {
    const cookie = await loginAs('admin@example.test')
    const res = await authedClient(() => cookie).get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: expect.any(String), email: 'admin@example.test', name: 'Ada', role: 'ADMIN' })
  })

  it('garbage cookie -> 401', async () => {
    const res = await call('GET', '/api/auth/me', { cookie: 'ah_session=garbage' })
    expect(res.status).toBe(401)
  })

  it('disabled user with a valid cookie is rejected', async () => {
    const cookie = await loginAs('admin@example.test')
    await prisma.user.updateMany({ data: { isDisabled: true } })
    const res = await authedClient(() => cookie).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('logout clears the cookie', async () => {
    const cookie = await loginAs('admin@example.test')
    const res = await authedClient(() => cookie).post('/api/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ loggedOut: true })
    expect(res.headers.get('set-cookie')).toMatch(/ah_session=;/)
  })

  it('logout without a session -> 401', async () => {
    expect((await call('POST', '/api/auth/logout')).status).toBe(401)
  })

  it('GET /api/health works without a cookie', async () => {
    const res = await call('GET', '/api/health')
    expect(res.status).toBe(200)
  })

  it('mutating request with foreign Origin -> 403 BAD_ORIGIN', async () => {
    const res = await login({ email: 'admin@example.test', password: TEST_PASSWORD }, { origin: 'http://evil.example' })
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('BAD_ORIGIN')
  })

  it('mutating request with the site Origin passes', async () => {
    const res = await login({ email: 'admin@example.test', password: TEST_PASSWORD }, { origin: 'http://localhost' })
    expect(res.status).toBe(200)
  })

  it('6th login attempt within a minute -> 429', async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await login({ email: 'admin@example.test', password: 'wrong-wrong-wrong' })
      expect(res.status).toBe(401)
    }
    const res = await login({ email: 'admin@example.test', password: 'wrong-wrong-wrong' })
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })

  it('rejects the sixth attempt before checking the password, even a correct one', async () => {
    for (let i = 0; i < 5; i += 1) await login({ email: 'admin@example.test', password: 'wrong-wrong-wrong' })
    const res = await login({ email: 'admin@example.test', password: TEST_PASSWORD })
    expect(res.status).toBe(429)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('a successful login resets the failure counter', async () => {
    for (let i = 0; i < 4; i += 1) await login({ email: 'admin@example.test', password: 'wrong-wrong-wrong' })
    expect((await login({ email: 'admin@example.test', password: TEST_PASSWORD })).status).toBe(200)
    for (let i = 0; i < 5; i += 1) {
      expect((await login({ email: 'admin@example.test', password: 'wrong-wrong-wrong' })).status).toBe(401)
    }
  })
})
