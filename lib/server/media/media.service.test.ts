import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logError } from '@/lib/server/log'
import { revalidateSite } from '@/lib/server/revalidate'
import * as imageService from './image.service'
import { get, list, patch, remove, upload } from './media.service'
import { MemoryStorage } from './storage/memory.storage'

const hoisted = vi.hoisted(() => ({
  storage: { current: undefined as unknown },
  fake: {
    media: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/server/prisma', () => ({ prisma: hoisted.fake }))
vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))
vi.mock('@/lib/server/revalidate', () => ({ revalidateSite: vi.fn() }))
vi.mock('./storage/storage.provider', () => ({ getStorage: () => hoisted.storage.current }))
vi.mock('./media.usage', () => ({ findMediaUsage: vi.fn(async () => []) }))
vi.mock('@/lib/server/revalidate/related-tags', () => ({ mediaUsageTags: vi.fn(async () => ['exhibition:sea']) }))

const fake = hoisted.fake

const ftypBox = (body = 'isom') => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from(`ftyp${body}`), Buffer.alloc(16)])
const webmHeader = () => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32)])
const videoBufferFor = (mime: string) => (mime === 'video/webm' ? webmHeader() : ftypBox())

let storage: MemoryStorage

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  storage = new MemoryStorage()
  hoisted.storage.current = storage
  fake.media.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'm1', ...data }))
})

describe('upload cleanup', () => {
  it('deletes both keys when the thumbnail put rejects', async () => {
    const realPut = storage.put.bind(storage)
    const puts: string[] = []
    vi.spyOn(storage, 'put').mockImplementation(async (key, body, type) => {
      puts.push(key)
      if (key.endsWith('-thumb.webp')) throw new Error('thumb put failed')
      return realPut(key, body, type)
    })
    const deleteSpy = vi.spyOn(storage, 'delete')
    const buffer = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } }).jpeg().toBuffer()

    await expect(upload({ buffer, mimetype: 'image/jpeg' }, 'alt', null)).rejects.toThrow('thumb put failed')

    expect(fake.media.create).not.toHaveBeenCalled()
    expect(deleteSpy.mock.calls.map(([key]) => key).sort()).toEqual([...puts].sort())
    for (const key of puts) expect(storage.has(key)).toBe(false)
  })

  it('deletes both keys when the row insert fails and logs a failed cleanup', async () => {
    fake.media.create.mockRejectedValueOnce(new Error('db down'))
    vi.spyOn(storage, 'delete').mockRejectedValue(new Error('r2 down'))
    const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()

    await expect(upload({ buffer, mimetype: 'image/png' }, 'alt', null)).rejects.toThrow('db down')

    expect(logError).toHaveBeenCalledTimes(2)
  })
})

describe('video upload', () => {
  it.each([
    ['video/mp4', 'mp4'],
    ['video/webm', 'webm'],
    ['video/quicktime', 'mov'],
  ])('stores one object for %s with kind VIDEO, thumbUrl = url and zero dimensions', async (mimetype, ext) => {
    const processSpy = vi.spyOn(imageService, 'processImage')
    const putSpy = vi.spyOn(storage, 'put')
    const buffer = videoBufferFor(mimetype)

    await upload({ buffer, mimetype }, 'A short film', 'u1')

    expect(processSpy).not.toHaveBeenCalled()
    expect(putSpy).toHaveBeenCalledTimes(1)
    const [key, , storedMime] = putSpy.mock.calls[0]!
    expect(key).toMatch(new RegExp(`^arthouz/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.${ext}$`))
    expect(storedMime).toBe(mimetype)
    expect(storage.has(key)).toBe(true)
    expect(fake.media.create).toHaveBeenCalledTimes(1)
    expect(fake.media.create.mock.calls[0]![0].data).toMatchObject({
      key,
      url: `/media/${key}`,
      thumbUrl: `/media/${key}`,
      width: 0,
      height: 0,
      mime: mimetype,
      kind: 'VIDEO',
      bytes: buffer.length,
      alt: 'A short film',
      uploadedById: 'u1',
    })
  })

  it('accepts a video larger than the 25 MB image limit', async () => {
    await upload({ buffer: Buffer.concat([ftypBox(), Buffer.alloc(30 * 1024 * 1024)]), mimetype: 'video/mp4' }, 'Big', null)
    expect(fake.media.create).toHaveBeenCalledTimes(1)
  })

  it('deletes the single object when the row insert fails', async () => {
    const putSpy = vi.spyOn(storage, 'put')
    fake.media.create.mockRejectedValueOnce(new Error('db down'))
    await expect(upload({ buffer: webmHeader(), mimetype: 'video/webm' }, 'x', null)).rejects.toThrow('db down')
    expect(storage.has(putSpy.mock.calls[0]![0])).toBe(false)
  })
})

describe('video signature check', () => {
  it.each([
    ['video/mp4', ftypBox('isom')],
    ['video/quicktime', ftypBox('qt  ')],
    ['video/webm', webmHeader()],
  ])('accepts a valid %s signature', async (mimetype, buffer) => {
    await upload({ buffer, mimetype }, 'ok', null)
    expect(fake.media.create).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['video/mp4', Buffer.from('not-really-a-video')],
    ['video/quicktime', Buffer.concat([Buffer.alloc(4), Buffer.from('moov'), Buffer.alloc(16)])],
    ['video/mp4', webmHeader()],
    ['video/webm', ftypBox()],
    ['video/webm', Buffer.alloc(0)],
    ['video/mp4', Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79])],
  ])('rejects %s with 400 INVALID_VIDEO before storing', async (mimetype, buffer) => {
    const putSpy = vi.spyOn(storage, 'put')
    await expect(upload({ buffer, mimetype }, 'bad', null)).rejects.toMatchObject({ status: 400, code: 'INVALID_VIDEO' })
    expect(putSpy).not.toHaveBeenCalled()
    expect(fake.media.create).not.toHaveBeenCalled()
  })
})

describe('image upload', () => {
  it('creates images with kind IMAGE', async () => {
    const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()
    await upload({ buffer, mimetype: 'image/png' }, 'alt', null)
    expect(fake.media.create.mock.calls[0]![0].data).toMatchObject({ kind: 'IMAGE', mime: 'image/png', width: 8, height: 8 })
  })
})

describe('remove', () => {
  const row = (key: string, kind: 'IMAGE' | 'VIDEO') => ({ id: 'm1', key, kind })

  it('deletes only the original key for a video', async () => {
    const deleteSpy = vi.spyOn(storage, 'delete')
    fake.media.findUnique.mockResolvedValue(row('arthouz/2026/10/abc.mp4', 'VIDEO'))
    await remove('m1')
    expect(deleteSpy.mock.calls.map(([k]) => k)).toEqual(['arthouz/2026/10/abc.mp4'])
  })

  it('deletes the original and thumbnail keys for an image', async () => {
    const deleteSpy = vi.spyOn(storage, 'delete')
    fake.media.findUnique.mockResolvedValue(row('arthouz/2026/10/abc.jpg', 'IMAGE'))
    await remove('m1')
    expect(deleteSpy.mock.calls.map(([k]) => k).sort()).toEqual(['arthouz/2026/10/abc-thumb.webp', 'arthouz/2026/10/abc.jpg'])
  })

  it('404s an unknown id', async () => {
    fake.media.findUnique.mockResolvedValue(null)
    await expect(remove('nope')).rejects.toMatchObject({ status: 404 })
  })
})

describe('list', () => {
  it('filters by kind when provided and not otherwise', async () => {
    fake.media.findMany.mockResolvedValue([])
    fake.media.count.mockResolvedValue(0)
    await list({ kind: 'VIDEO', page: 1, limit: 10, skip: 0 })
    expect(fake.media.findMany.mock.calls[0]![0]).toMatchObject({ where: { AND: [{ kind: 'VIDEO' }] } })
    await list({ page: 1, limit: 10, skip: 0 })
    expect(fake.media.findMany.mock.calls[1]![0]).toMatchObject({ where: {} })
  })
})

describe('get and patch', () => {
  it('get returns the row with its usage', async () => {
    fake.media.findUnique.mockResolvedValue({ id: 'm1' })
    await expect(get('m1')).resolves.toEqual({ id: 'm1', usedBy: [] })
  })

  it('patch updates alt and revalidates the pages using the media', async () => {
    fake.media.findUnique.mockResolvedValue({ id: 'm1' })
    fake.media.update.mockResolvedValue({ id: 'm1', alt: 'New' })
    await patch('m1', { alt: 'New' })
    expect(fake.media.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { alt: 'New' } })
    expect(revalidateSite).toHaveBeenCalledWith(['exhibition:sea'])
  })

  it('patch still succeeds, and logs, when revalidation fails', async () => {
    fake.media.findUnique.mockResolvedValue({ id: 'm1' })
    fake.media.update.mockResolvedValue({ id: 'm1' })
    vi.mocked(revalidateSite).mockImplementationOnce(() => {
      throw new Error('cache down')
    })
    await expect(patch('m1', { alt: 'x', caption: null })).resolves.toEqual({ id: 'm1' })
    expect(fake.media.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { alt: 'x', caption: null } })
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('m1'))
  })
})
