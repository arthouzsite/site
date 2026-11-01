import { describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({ env: { STORAGE_DRIVER: 'r2' as 'r2' | 'memory' } }))

vi.mock('@/lib/server/env', () => ({ env: hoisted.env }))
vi.mock('@/lib/server/auth/current-user', () => ({
  currentUser: async () => null,
  requireUser: async () => ({ id: 'u1', role: 'EDITOR' }),
}))

vi.mock('@/lib/server/prisma', () => ({ prisma: { media: { findUnique: async () => null } } }))

import { PUT } from '@/app/api/media/uploads/[...key]/route'
import { memoryStorage } from '@/lib/server/media/storage/storage.provider'

const KEY = 'arthouz/2026/12345678-1234-1234-1234-123456789012.png'
const put = async () => {
  await memoryStorage.createUploadTarget(KEY, 'image/png', 1)
  return send()
}
const send = () =>
  PUT(new Request(`http://localhost/api/media/uploads/${KEY}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: 'x' }), {
    params: Promise.resolve({ key: KEY.split('/') }),
  })

describe('PUT /api/media/uploads/[...key]', () => {
  it('answers the 404 envelope and stores nothing with the r2 driver', async () => {
    hoisted.env.STORAGE_DRIVER = 'r2'
    const res = await put()
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ ok: false, error: { code: 'NOT_FOUND', message: 'No such endpoint' } })
    expect(memoryStorage.has(KEY)).toBe(false)
  })

  it('stores the body with the memory driver', async () => {
    hoisted.env.STORAGE_DRIVER = 'memory'
    expect((await put()).status).toBe(200)
    expect(memoryStorage.has(KEY)).toBe(true)
  })
})
