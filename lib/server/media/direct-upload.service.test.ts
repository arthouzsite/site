import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Prisma } from '@/lib/server/generated/prisma/client'
import { completeUpload, createUpload } from './direct-upload.service'
import { MAX_CONCURRENT_UPLOADS } from './media.constants'
import { MemoryStorage } from './storage/memory.storage'
import { withUploadSlot } from './upload-slots'

const hoisted = vi.hoisted(() => ({
  storage: { current: undefined as unknown },
  fake: { media: { create: vi.fn(), findUnique: vi.fn() } },
}))

vi.mock('@/lib/server/prisma', () => ({ prisma: hoisted.fake }))
vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))
vi.mock('./storage/storage.provider', () => ({ getStorage: () => hoisted.storage.current }))

const fake = hoisted.fake
const KEY = 'arthouz/2026/12345678-1234-1234-1234-123456789012.png'
const THUMB_KEY = 'arthouz/2026/12345678-1234-1234-1234-123456789012-thumb.webp'
const ftyp = () => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(64)])

let storage: MemoryStorage
let png: Buffer

beforeEach(async () => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  storage = new MemoryStorage()
  hoisted.storage.current = storage
  fake.media.findUnique.mockResolvedValue(null)
  fake.media.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'm1', ...data }))
  png = await sharp({ create: { width: 10, height: 6, channels: 3, background: '#fff' } }).png().toBuffer()
})

describe('createUpload', () => {
  it('returns the allocated key together with the storage target', async () => {
    const grant = await createUpload({ filename: 'a.png', mime: 'image/png', bytes: 10, alt: 'x' })
    expect(grant.key).toMatch(/^arthouz\/\d{4}\/[0-9a-f-]{36}\.png$/)
    expect(grant).toMatchObject({ method: 'PUT', url: `/api/media/uploads/${grant.key}`, headers: { 'content-type': 'image/png' } })
  })

  it('allocates no key and calls no storage for a disallowed type or size', async () => {
    const spy = vi.spyOn(storage, 'createUploadTarget')
    await expect(createUpload({ filename: 'a', mime: 'text/html', bytes: 1, alt: 'x' })).rejects.toMatchObject({ status: 415 })
    await expect(createUpload({ filename: 'a', mime: 'image/png', bytes: 26 * 1024 * 1024, alt: 'x' })).rejects.toMatchObject({ status: 413 })
    expect(spy).not.toHaveBeenCalled()
  })
})

describe('completeUpload', () => {
  it('409s a key that already has a row and leaves its object alone', async () => {
    await storage.put(KEY, png, 'image/png')
    fake.media.findUnique.mockResolvedValue({ id: 'existing' })
    await expect(completeUpload({ key: KEY, alt: 'x' }, null)).rejects.toMatchObject({ status: 409, code: 'UPLOAD_ALREADY_COMPLETED' })
    expect(storage.has(KEY)).toBe(true)
  })

  it('keeps the winner objects when a concurrent completion loses the unique-key race', async () => {
    await storage.put(KEY, png, 'image/png')
    fake.media.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'test' }),
    )
    await expect(completeUpload({ key: KEY, alt: 'x' }, null)).rejects.toMatchObject({ status: 409, code: 'UPLOAD_ALREADY_COMPLETED' })
    expect(storage.has(KEY)).toBe(true)
    expect(storage.has(THUMB_KEY)).toBe(true)
  })

  it('removes the original and thumbnail when the row insert fails', async () => {
    await storage.put(KEY, png, 'image/png')
    fake.media.create.mockRejectedValueOnce(new Error('db down'))
    await expect(completeUpload({ key: KEY, alt: 'x' }, null)).rejects.toThrow('db down')
    expect(storage.has(KEY)).toBe(false)
    expect(storage.has(THUMB_KEY)).toBe(false)
  })

  it('429s when every upload slot is taken, keeping the object for a retry', async () => {
    await storage.put(KEY, png, 'image/png')
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => (release = resolve))
    const holders = Array.from({ length: MAX_CONCURRENT_UPLOADS }, () => withUploadSlot(() => gate))
    await expect(completeUpload({ key: KEY, alt: 'x' }, null)).rejects.toMatchObject({ status: 429, code: 'TOO_MANY_UPLOADS' })
    expect(storage.has(KEY)).toBe(true)
    release()
    await Promise.all(holders)
  })

  it('reads only the first 64 KB of a video', async () => {
    const key = 'arthouz/2026/12345678-1234-1234-1234-123456789012.mp4'
    await storage.put(key, ftyp(), 'video/mp4')
    const getSpy = vi.spyOn(storage, 'get')
    const rangeSpy = vi.spyOn(storage, 'getRange')
    await completeUpload({ key, alt: 'x' }, 'u1')
    expect(getSpy).not.toHaveBeenCalled()
    expect(rangeSpy).toHaveBeenCalledWith(key, 0, 65535)
    expect(fake.media.create.mock.calls[0]![0].data).toMatchObject({ key, kind: 'VIDEO', uploadedById: 'u1', url: `memory://${key}` })
  })

  it('deletes the object when the bytes read exceed the image limit although head reported a small size', async () => {
    await storage.put(KEY, png, 'image/png')
    vi.spyOn(storage, 'get').mockResolvedValue(Buffer.alloc(25 * 1024 * 1024 + 1))
    await expect(completeUpload({ key: KEY, alt: 'x' }, null)).rejects.toMatchObject({ status: 413 })
    expect(storage.has(KEY)).toBe(false)
    expect(fake.media.create).not.toHaveBeenCalled()
  })

  it('records the size of the bytes read, not the size head reported', async () => {
    await storage.put(KEY, png, 'image/png')
    vi.spyOn(storage, 'head').mockResolvedValue({ bytes: 1, contentType: 'image/png' })
    await completeUpload({ key: KEY, alt: 'x' }, null)
    expect(fake.media.create.mock.calls[0]![0].data.bytes).toBe(png.length)
  })

  it('does not delete the object on an unexpected storage failure', async () => {
    await storage.put(KEY, png, 'image/png')
    vi.spyOn(storage, 'get').mockRejectedValue(new Error('r2 timeout'))
    await expect(completeUpload({ key: KEY, alt: 'x' }, null)).rejects.toThrow('r2 timeout')
    expect(storage.has(KEY)).toBe(true)
  })
})
