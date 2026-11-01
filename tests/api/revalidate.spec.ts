import { revalidateTag } from 'next/cache'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { loginAs, seedUser } from './helpers/users'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: <T>(fn: T) => fn }))

describe('revalidate', () => {
  let adminCookie: string
  let editorCookie: string
  const admin = authedClient(() => adminCookie)
  const editor = authedClient(() => editorCookie)
  const expiredTags = () => vi.mocked(revalidateTag).mock.calls.map(([tag]) => tag)

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    await seedUser({ email: 'editor@example.test', role: 'EDITOR' })
    adminCookie = await loginAs('admin@example.test')
    editorCookie = await loginAs('editor@example.test')
    vi.mocked(revalidateTag).mockClear()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  async function seedRows() {
    const day = new Date('2026-01-01')
    await prisma.exhibition.create({ data: { slug: 'spring-show', title: 'Spring', city: 'Delhi', country: 'India', type: 'SOLO', startDate: day, endDate: day } })
    await prisma.artist.create({ data: { slug: 'jane-doe', name: 'Jane Doe', sortName: 'Doe, Jane' } })
    await prisma.service.create({ data: { slug: 'advisory', title: 'Advisory' } })
    await prisma.news.create({ data: { slug: 'press-note', title: 'Press', publishedAt: day } })
  }

  it('expires every tag, including per-slug ones, when called without a body', async () => {
    await seedRows()
    const res = await admin.post('/api/revalidate')
    expect(res.status).toBe(200)
    const tags = expiredTags()
    expect(tags).toEqual(expect.arrayContaining(['home', 'search', 'exhibitions', 'artists', 'fairs', 'services', 'news', 'locations', 'about', 'settings']))
    expect(tags).toEqual(expect.arrayContaining(['exhibition:spring-show', 'artist:jane-doe', 'service:advisory']))
    expect(res.body.data).toEqual({ revalidated: new Set(tags).size })
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith('home', { expire: 0 })
  })

  it('treats an empty tags-less object like no body', async () => {
    const res = await admin.post('/api/revalidate', {})
    expect(res.status).toBe(200)
    expect(expiredTags()).toContain('home')
  })

  it('expires only the given tags', async () => {
    await seedRows()
    const res = await admin.post('/api/revalidate', { tags: ['home', 'fairs', 'home'] })
    expect(res.status).toBe(200)
    expect(expiredTags()).toEqual(['home', 'fairs'])
    expect(res.body.data).toEqual({ revalidated: 2 })
  })

  it('answers 403 to an editor and expires nothing', async () => {
    expect((await editor.post('/api/revalidate')).status).toBe(403)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('answers 401 without a session', async () => {
    const res = await call('POST', '/api/revalidate')
    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it.each([
    ['an empty list', { tags: [] }],
    ['an empty tag', { tags: [''] }],
    ['a non-string tag', { tags: [1] }],
    ['an over-long tag', { tags: ['x'.repeat(201)] }],
    ['too many tags', { tags: Array.from({ length: 201 }, (_, i) => `t${i}`) }],
    ['a non-array', { tags: 'home' }],
  ])('rejects %s with 400', async (_name, body) => {
    const res = await admin.post('/api/revalidate', body)
    expect(res.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('rejects a non-object body with 400', async () => {
    const res = await admin.post('/api/revalidate', ['home'])
    expect(res.status).toBe(400)
  })

  it('does not answer GET', async () => {
    expect((await admin.get('/api/revalidate')).status).toBe(405)
  })
})
