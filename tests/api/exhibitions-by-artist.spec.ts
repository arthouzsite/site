import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { authedClient } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

const input = (over: Record<string, unknown> = {}) => ({
  title: 'Tidewater', city: 'Mumbai', country: 'India', type: 'SOLO', startDate: '2026-12-01', endDate: '2027-01-15', ...over,
})

describe('exhibitions filtered by artist', () => {
  let cookie: string
  const authed = authedClient(() => cookie)
  const artist = (name: string) => prisma.artist.create({ data: { slug: name.toLowerCase(), name, sortName: name } })
  const exhibition = async (title: string, artistIds: string[]) => {
    const res = await authed.post('/api/exhibitions', input({ title, artistIds }))
    expect(res.status).toBe(201)
    return res.body.data as { id: string }
  }

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = await loginAs('admin@example.test')
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('returns only exhibitions that include the artist', async () => {
    const [ada, bo] = [await artist('Ada'), await artist('Bo')]
    const both = await exhibition('Both', [ada.id, bo.id])
    await exhibition('Only Bo', [bo.id])
    await exhibition('Nobody', [])
    const res = await authed.get(`/api/exhibitions?artistId=${ada.id}`)
    expect(res.status).toBe(200)
    expect((res.body.data as { id: string }[]).map((e) => e.id)).toEqual([both.id])
    expect(res.body.meta.total).toBe(1)
  })

  it('rejects a malformed artistId', async () => {
    expect((await authed.get('/api/exhibitions?artistId=nope')).status).toBe(400)
  })
})
