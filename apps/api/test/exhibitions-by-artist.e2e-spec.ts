import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { PrismaService } from '../src/common/prisma.service'
import { createTestApp } from './helpers/app'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, resetThrottle, seedUser } from './helpers/users'

const input = (over: Record<string, unknown> = {}) => ({
  title: 'Tidewater', city: 'Mumbai', country: 'India', type: 'SOLO', startDate: '2026-12-01', endDate: '2027-01-15', ...over,
})

describe('exhibitions filtered by artist', () => {
  let app: INestApplication
  let prisma: PrismaService
  let cookie: string
  const get = (path: string) => request(app.getHttpServer()).get(path).set('Cookie', cookie)
  const artist = (name: string) => prisma.artist.create({ data: { slug: name.toLowerCase(), name, sortName: name } })
  const exhibition = async (title: string, artistIds: string[]) => {
    const res = await request(app.getHttpServer()).post('/exhibitions').set('Cookie', cookie).send(input({ title, artistIds })).expect(201)
    return res.body.data as { id: string }
  }

  beforeAll(async () => {
    migrateTestDb()
    app = await createTestApp()
    prisma = app.get(PrismaService)
  })
  beforeEach(async () => {
    await resetDb()
    resetThrottle(app)
    await seedUser(app, { email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs(app, 'admin@example.test')
  })
  afterAll(async () => {
    await app.close()
  })

  it('returns only exhibitions that include the artist', async () => {
    const [ada, bo] = [await artist('Ada'), await artist('Bo')]
    const both = await exhibition('Both', [ada.id, bo.id])
    await exhibition('Only Bo', [bo.id])
    await exhibition('Nobody', [])
    const res = await get(`/exhibitions?artistId=${ada.id}`).expect(200)
    expect((res.body.data as { id: string }[]).map((e) => e.id)).toEqual([both.id])
    expect(res.body.meta.total).toBe(1)
  })

  it('rejects a malformed artistId', async () => {
    await get('/exhibitions?artistId=nope').expect(400)
  })
})
