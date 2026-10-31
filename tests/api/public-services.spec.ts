import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { publicSearchSchema, publicServiceListSchema, publicServiceSchema } from '@/lib/shared'
import { prisma } from '@/lib/server/prisma'
import { authedClient, call } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { ok } from './helpers/public'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))

describe('public services and search', () => {
  let cookie: string
  const api = authedClient(() => cookie)

  async function create(over: Record<string, unknown> = {}) {
    const res = await api.post('/api/services', { title: 'Art sales', ...over })
    expect(res.status).toBe(201)
    return res.body.data as { id: string; slug: string }
  }
  const publish = async (id: string, isPublished: boolean) =>
    expect((await api.patch(`/api/services/${id}/publish`, { isPublished })).status).toBe(200)

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

  it('lists only published services in sortOrder with the public shape', async () => {
    const image = await prisma.media.create({
      data: { key: 'pub', url: 'https://x/pub.jpg', thumbUrl: 'https://x/pubt.jpg', width: 3, height: 2, mime: 'image/jpeg', bytes: 1, alt: 'alt pub' },
    })
    const a = await create({ title: 'A', summary: 'sa', imageId: image.id, contactName: 'Asha', contactPhone: '+914412345678', contactEmail: 'a@b.co', ctaHref: 'tel:+914412345678' })
    const b = await create({ title: 'B' })
    const c = await create({ title: 'C' })
    const draft = await create({ title: 'Draft' })
    for (const s of [a, b, c]) await publish(s.id, true)
    expect((await api.put('/api/services/order', { ids: [c.id, a.id, b.id, draft.id] })).status).toBe(200)
    const list = await ok('/api/public/services', publicServiceListSchema)
    expect(list.map((s) => s.slug)).toEqual(['c', 'a', 'b'])
    expect(list[1]).toEqual({
      slug: 'a', title: 'A', summary: 'sa', body: '', image: { url: 'https://x/pub.jpg', thumbUrl: 'https://x/pubt.jpg', width: 3, height: 2, alt: 'alt pub' },
      ctaLabel: 'Enquire →', ctaHref: 'tel:+914412345678', contact: { name: 'Asha', phone: '+914412345678', email: 'a@b.co' },
    })
  })

  it('detail returns a published service and 404s when missing or unpublished', async () => {
    const s = await create({ title: 'Visible' })
    await publish(s.id, true)
    const visible = await ok('/api/public/services/visible', publicServiceSchema)
    expect(visible).toMatchObject({ slug: 'visible', title: 'Visible', contact: { name: '', phone: '', email: '' } })
    await publish(s.id, false)
    const hidden = await call('GET', '/api/public/services/visible')
    expect(hidden.status).toBe(404)
    expect(hidden.body.error.code).toBe('NOT_FOUND')
    expect((await call('GET', '/api/public/services/nope')).status).toBe(404)
  })

  it('search shows a Services group for published title or summary matches only', async () => {
    const a = await create({ title: 'Gallery on rent', summary: 'Hire the Chennai gallery' })
    const b = await create({ title: 'Art for rent', summary: 'Offices' })
    await create({ title: 'Hidden rental', summary: 'draft rental' })
    await publish(a.id, true)
    await publish(b.id, true)
    const res = await ok('/api/public/search?q=rent', publicSearchSchema)
    expect(res.groups).toEqual([
      { label: 'Services', items: [{ label: 'Gallery on rent', href: '/services/gallery-on-rent' }, { label: 'Art for rent', href: '/services/art-for-rent' }] },
    ])
    const bySummary = await ok('/api/public/search?q=chennai', publicSearchSchema)
    expect(bySummary.groups.map((g) => g.label)).toEqual(['Services'])
  })
})
