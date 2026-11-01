import { afterEach, describe, expect, it, vi } from 'vitest'

const R2_ENV = {
  STORAGE_DRIVER: 'r2' as const,
  S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
  AWS_ACCESS_KEY_ID: 'key',
  AWS_SECRET_ACCESS_KEY: 'secret',
  AWS_S3_BUCKET_NAME: 'bucket',
  MEDIA_URL_BASE: '/media',
}

afterEach(() => {
  vi.doUnmock('@/lib/server/env')
  vi.resetModules()
})

describe('getStorage', () => {
  it('returns the memory singleton when the driver is memory', async () => {
    const { getStorage, memoryStorage } = await import('./storage.provider')
    expect(getStorage()).toBe(memoryStorage)
    expect(getStorage()).toBe(getStorage())
  })

  it('returns one R2 storage when the driver is r2', async () => {
    vi.doMock('@/lib/server/env', () => ({ env: R2_ENV }))
    const { getStorage, memoryStorage } = await import('./storage.provider')
    const { R2Storage } = await import('./r2.storage')
    const storage = getStorage()
    expect(storage).toBeInstanceOf(R2Storage)
    expect(storage).not.toBe(memoryStorage)
    expect(getStorage()).toBe(storage)
  })
})
