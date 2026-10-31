import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

const NEW_PASSWORD = 'a-brand-new-password'
const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000'

describe('users', () => {
  let adminCookie: string
  let adminId: string
  const admin = authedClient(() => adminCookie)
  const login = (email: string, password: string) => call('POST', '/api/auth/login', { body: { email, password } })

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    adminId = (await seedUser({ email: 'admin@example.test', role: 'ADMIN' })).id
    adminCookie = await loginAs('admin@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('as an EDITOR', () => {
    let editor: ReturnType<typeof authedClient>
    let editorId: string

    beforeEach(async () => {
      editorId = (await seedUser({ email: 'ed@example.test', role: 'EDITOR' })).id
      const editorCookie = await loginAs('ed@example.test')
      editor = authedClient(() => editorCookie)
    })

    it('POST /users -> 403 and no user is created', async () => {
      const res = await editor.post('/api/users', { email: 'n@example.test', name: 'N', role: 'EDITOR', password: NEW_PASSWORD })
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
      expect(await prisma.user.count()).toBe(2)
      expect(await prisma.user.findUnique({ where: { email: 'n@example.test' } })).toBeNull()
    })

    it('GET /users -> 403', async () => {
      const res = await editor.get('/api/users')
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('PATCH /users/:id -> 403 and the row is unchanged', async () => {
      const res = await editor.patch(`/api/users/${editorId}`, { role: 'ADMIN', name: 'Promoted' })
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
      expect(await prisma.user.findUnique({ where: { id: editorId } })).toMatchObject({ role: 'EDITOR', name: 'Test User' })
    })

    it('DELETE /users/:id -> 403 and the row is still present', async () => {
      const res = await editor.del(`/api/users/${adminId}`)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
      expect(await prisma.user.findUnique({ where: { id: adminId } })).not.toBeNull()
    })
  })

  it('unauthenticated GET /users -> 401', async () => {
    const res = await call('GET', '/api/users')
    expect(res.status).toBe(401)
  })

  it('ADMIN creates a user who can log in; no hash in response', async () => {
    const res = await admin.post('/api/users', { email: 'New@Example.test', name: 'New', role: 'EDITOR', password: NEW_PASSWORD })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ email: 'new@example.test', name: 'New', role: 'EDITOR', isDisabled: false })
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/)
    expect((await login('new@example.test', NEW_PASSWORD)).status).toBe(200)
  })

  it('create without password -> 400 VALIDATION', async () => {
    const res = await admin.post('/api/users', { email: 'n@example.test', name: 'N', role: 'EDITOR' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('duplicate email -> 409', async () => {
    const res = await admin.post('/api/users', { email: 'admin@example.test', name: 'D', role: 'EDITOR', password: NEW_PASSWORD })
    expect(res.status).toBe(409)
  })

  it('GET /users lists without hashes', async () => {
    const res = await admin.get('/api/users')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/)
  })

  it('PATCH updates name/role, changes password, and disables', async () => {
    const editor = await seedUser({ email: 'ed@example.test', role: 'EDITOR' })
    const res = await admin.patch(`/api/users/${editor.id}`, { name: 'Renamed', role: 'ADMIN', password: NEW_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ name: 'Renamed', role: 'ADMIN' })
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/)
    expect((await login('ed@example.test', NEW_PASSWORD)).status).toBe(200)
    expect((await admin.patch(`/api/users/${editor.id}`, { isDisabled: true })).status).toBe(200)
    expect((await login('ed@example.test', NEW_PASSWORD)).status).toBe(401)
  })

  it('PATCH unknown id -> 404', async () => {
    expect((await admin.patch(`/api/users/${UNKNOWN_UUID}`, { name: 'x' })).status).toBe(404)
  })

  it('DELETE self -> 400 CANNOT_DELETE_SELF', async () => {
    const res = await admin.del(`/api/users/${adminId}`)
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CANNOT_DELETE_SELF')
  })

  it('DELETE another user succeeds', async () => {
    const editor = await seedUser({ email: 'ed@example.test', role: 'EDITOR' })
    const del = await admin.del(`/api/users/${editor.id}`)
    expect(del.status).toBe(200)
    expect(del.body.data).toEqual({ id: editor.id })
    const list = await admin.get('/api/users')
    expect(list.body.data).toHaveLength(1)
  })

  it('refuses to change your own role or disable yourself -> 403 SELF_LOCKOUT', async () => {
    await seedUser({ email: 'second@example.test', role: 'ADMIN' })
    for (const body of [{ role: 'EDITOR' }, { isDisabled: true }]) {
      const res = await admin.patch(`/api/users/${adminId}`, body)
      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('SELF_LOCKOUT')
    }
    const same = await admin.patch(`/api/users/${adminId}`, { name: 'Me', role: 'ADMIN', isDisabled: false })
    expect(same.status).toBe(200)
  })

  it('an admin may demote or disable another admin while one stays enabled', async () => {
    const other = await seedUser({ email: 'second@example.test', role: 'ADMIN' })
    expect((await admin.patch(`/api/users/${other.id}`, { role: 'EDITOR' })).status).toBe(200)
    expect((await admin.patch(`/api/users/${other.id}`, { role: 'ADMIN' })).status).toBe(200)
    expect((await admin.patch(`/api/users/${other.id}`, { isDisabled: true })).status).toBe(200)
    expect((await admin.del(`/api/users/${other.id}`)).status).toBe(200)
  })
})
