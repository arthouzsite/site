import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const NEW_PASSWORD = 'a-brand-new-password'

describe('users', () => {
  let app: INestApplication
  let adminCookie: string
  let adminId: string
  const http = () => request(app.getHttpServer())

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
  })
  beforeEach(async () => {
    await resetDb()
    resetThrottle(app)
    adminId = (await seedUser(app, { email: 'admin@example.test', role: 'ADMIN' })).id
    adminCookie = await loginAs(app, 'admin@example.test')
  })
  afterAll(async () => {
    await app.close()
  })

  it('EDITOR calling POST /users -> 403', async () => {
    await seedUser(app, { email: 'ed@example.test', role: 'EDITOR' })
    const cookie = await loginAs(app, 'ed@example.test')
    const res = await http()
      .post('/users')
      .set('Cookie', cookie)
      .send({ email: 'n@example.test', name: 'N', role: 'EDITOR', password: NEW_PASSWORD })
      .expect(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('unauthenticated GET /users -> 401', async () => {
    await http().get('/users').expect(401)
  })

  it('ADMIN creates a user who can log in; no hash in response', async () => {
    const res = await http()
      .post('/users')
      .set('Cookie', adminCookie)
      .send({ email: 'New@Example.test', name: 'New', role: 'EDITOR', password: NEW_PASSWORD })
      .expect(201)
    expect(res.body.data).toMatchObject({ email: 'new@example.test', name: 'New', role: 'EDITOR', isDisabled: false })
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/)
    await http().post('/auth/login').send({ email: 'new@example.test', password: NEW_PASSWORD }).expect(200)
  })

  it('create without password -> 400 VALIDATION', async () => {
    const res = await http().post('/users').set('Cookie', adminCookie).send({ email: 'n@example.test', name: 'N', role: 'EDITOR' }).expect(400)
    expect(res.body.error.code).toBe('VALIDATION')
  })

  it('duplicate email -> 409', async () => {
    await http()
      .post('/users')
      .set('Cookie', adminCookie)
      .send({ email: 'admin@example.test', name: 'D', role: 'EDITOR', password: NEW_PASSWORD })
      .expect(409)
  })

  it('GET /users lists without hashes', async () => {
    const res = await http().get('/users').set('Cookie', adminCookie).expect(200)
    expect(res.body.data).toHaveLength(1)
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2/)
  })

  it('PATCH updates name/role, changes password, and disables', async () => {
    const editor = await seedUser(app, { email: 'ed@example.test', role: 'EDITOR' })
    const res = await http()
      .patch(`/users/${editor.id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'Renamed', role: 'ADMIN', password: NEW_PASSWORD })
      .expect(200)
    expect(res.body.data).toMatchObject({ name: 'Renamed', role: 'ADMIN' })
    await http().post('/auth/login').send({ email: 'ed@example.test', password: NEW_PASSWORD }).expect(200)
    await http().patch(`/users/${editor.id}`).set('Cookie', adminCookie).send({ isDisabled: true }).expect(200)
    await http().post('/auth/login').send({ email: 'ed@example.test', password: NEW_PASSWORD }).expect(401)
  })

  it('PATCH unknown id -> 404', async () => {
    await http().patch('/users/00000000-0000-0000-0000-000000000000').set('Cookie', adminCookie).send({ name: 'x' }).expect(404)
  })

  it('DELETE self -> 400 CANNOT_DELETE_SELF', async () => {
    const res = await http().delete(`/users/${adminId}`).set('Cookie', adminCookie).expect(400)
    expect(res.body.error.code).toBe('CANNOT_DELETE_SELF')
  })

  it('DELETE another user succeeds', async () => {
    const editor = await seedUser(app, { email: 'ed@example.test', role: 'EDITOR' })
    await http().delete(`/users/${editor.id}`).set('Cookie', adminCookie).expect(200)
    const list = await http().get('/users').set('Cookie', adminCookie).expect(200)
    expect(list.body.data).toHaveLength(1)
  })

  it('refuses to change your own role or disable yourself -> 403 SELF_LOCKOUT', async () => {
    await seedUser(app, { email: 'second@example.test', role: 'ADMIN' })
    for (const body of [{ role: 'EDITOR' }, { isDisabled: true }]) {
      const res = await http().patch(`/users/${adminId}`).set('Cookie', adminCookie).send(body).expect(403)
      expect(res.body.error.code).toBe('SELF_LOCKOUT')
    }
    await http().patch(`/users/${adminId}`).set('Cookie', adminCookie).send({ name: 'Me', role: 'ADMIN', isDisabled: false }).expect(200)
  })

  it('an admin may demote or disable another admin while one stays enabled', async () => {
    const other = await seedUser(app, { email: 'second@example.test', role: 'ADMIN' })
    await http().patch(`/users/${other.id}`).set('Cookie', adminCookie).send({ role: 'EDITOR' }).expect(200)
    await http().patch(`/users/${other.id}`).set('Cookie', adminCookie).send({ role: 'ADMIN' }).expect(200)
    await http().patch(`/users/${other.id}`).set('Cookie', adminCookie).send({ isDisabled: true }).expect(200)
    await http().delete(`/users/${other.id}`).set('Cookie', adminCookie).expect(200)
  })
})
