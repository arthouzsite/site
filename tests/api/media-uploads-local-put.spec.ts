import { describe, expect, it, vi } from 'vitest'

const hoisted = vi.hoisted(() => ({ env: { STORAGE_DRIVER: 'r2' as 'r2' | 'memory' } }))

vi.mock('@/lib/server/env', () => ({ env: hoisted.env }))
vi.mock('@/lib/server/auth/current-user', () => ({
  currentUser: async () => null,
  requireUser: async () => ({ id: 'u1', role: 'EDITOR' }),
}))

vi.mock('@/lib/server/prisma', () => ({ prisma: { media: { findUnique: async () => null } } }))

import { PUT } from '@/app/api/media/uploads/[...key]/route'
import { MemoryStorage } from '@/lib/server/media/storage/memory.storage'
import { memoryStorage, setStorageForTests } from '@/lib/server/media/storage/storage.provider'

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
  it('writes the body to the bucket with the r2 driver, without a prior declaration', async () => {
    hoisted.env.STORAGE_DRIVER = 'r2'
    const bucket = new MemoryStorage('https://cdn.test')
    setStorageForTests(bucket)
    try {
      expect((await send()).status).toBe(200)
      expect(await bucket.head(KEY)).toEqual({ bytes: 1, contentType: 'image/png' })
      expect(memoryStorage.has(KEY)).toBe(false)
    } finally {
      setStorageForTests(undefined)
    }
  })

  it('refuses an empty body and a type that is not allowed with the r2 driver', async () => {
    hoisted.env.STORAGE_DRIVER = 'r2'
    const bucket = new MemoryStorage('https://cdn.test')
    setStorageForTests(bucket)
    try {
      const empty = await PUT(new Request(`http://localhost/api/media/uploads/${KEY}`, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: '' }), {
        params: Promise.resolve({ key: KEY.split('/') }),
      })
      expect(empty.status).toBe(400)
      expect(await empty.json()).toMatchObject({ error: { code: 'EMPTY_UPLOAD' } })
      expect(bucket.has(KEY)).toBe(false)
    } finally {
      setStorageForTests(undefined)
    }
  })

  it('stores the body with the memory driver', async () => {
    hoisted.env.STORAGE_DRIVER = 'memory'
    expect((await put()).status).toBe(200)
    expect(memoryStorage.has(KEY)).toBe(true)
  })
})
