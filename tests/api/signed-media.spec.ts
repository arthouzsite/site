import sharp from 'sharp'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/server/prisma'
import { MemoryStorage } from '@/lib/server/media/storage/memory.storage'
import { setStorageForTests } from '@/lib/server/media/storage/storage.provider'
import { call, SESSION_COOKIE_NAME } from './helpers/client'
import { migrateTestDb, resetDb } from './helpers/db'
import { day } from './helpers/public'
import { loginAs, seedUser } from './helpers/users'

vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('@/lib/server/clock', () => ({ today: () => new Date('2026-10-30T00:00:00.000Z') }))

/** Stands in for R2: media links come back as signed-looking absolute URLs. */
class SigningMemoryStorage extends MemoryStorage {
  override async publicUrlFor(key: string): Promise<string> {
    return `https://signed.test/${key}?sig=1`
  }
}

describe('media URL presentation', () => {
  let cookie: string
  let key: string

  beforeAll(() => {
    migrateTestDb()
  })
  beforeEach(async () => {
    await resetDb()
    await seedUser({ email: 'admin@example.test', role: 'ADMIN' })
    cookie = `${SESSION_COOKIE_NAME}=${await loginAs('admin@example.test')}`
    const form = new FormData()
    form.set('alt', 'A calm sea')
    const jpeg = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#335' } }).jpeg().toBuffer()
    form.set('file', new File([jpeg as BlobPart], 'x.jpg', { type: 'image/jpeg' }))
    const uploaded = await call('POST', '/api/media', { form, cookie })
    key = uploaded.body.data.key as string
    const media = await prisma.media.findFirstOrThrow({ where: { key } })
    await prisma.exhibition.create({
      data: { slug: 'sea-show', title: 'Sea', city: 'Chennai', country: 'India', type: 'SOLO', startDate: day('2025-01-01'), endDate: day('2025-02-01'), isPublished: true, heroImageId: media.id } as never,
    })
  })
  afterEach(() => setStorageForTests(undefined))
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('keeps /media urls under the memory driver, and never changes what is stored', async () => {
    const list = await call('GET', '/api/media', { cookie })
    expect(list.body.data[0].url).toBe(`/media/${key}`)
    expect(list.body.data[0].thumbUrl).toMatch(/^\/media\/arthouz\/.*-thumb\.webp$/)
    const detail = await call('GET', '/api/public/exhibitions/sea-show')
    expect(JSON.stringify(detail.body.data)).toContain(`/media/${key}`)
  })

  it('presents the admin media list (data and pagination meta intact) as signed urls', async () => {
    setStorageForTests(new SigningMemoryStorage())
    const list = await call('GET', '/api/media', { cookie })
    expect(list.status).toBe(200)
    expect(list.body.data[0].url).toBe(`https://signed.test/${key}?sig=1`)
    expect(list.body.data[0].thumbUrl).toMatch(/^https:\/\/signed\.test\/arthouz\/.*-thumb\.webp\?sig=1$/)
    expect(list.body.meta).toBeDefined()
    expect((await prisma.media.findFirstOrThrow({ where: { key } })).url).toBe(`/media/${key}`)
  })

  it('presents a public exhibition response as signed urls', async () => {
    setStorageForTests(new SigningMemoryStorage())
    const detail = await call('GET', '/api/public/exhibitions/sea-show')
    expect(detail.status).toBe(200)
    const urls = JSON.stringify(detail.body.data).match(/"https?:\/\/[^"]+"|"\/media\/[^"]+"/g) ?? []
    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) expect(url).toMatch(/^"https:\/\/signed\.test\//)
  })
})
