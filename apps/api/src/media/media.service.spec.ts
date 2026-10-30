import { BadRequestException, HttpException, PayloadTooLargeException } from '@nestjs/common'
import sharp from 'sharp'
import type { PrismaService } from '../common/prisma.service'
import { ImageService } from './image.service'
import { MAX_CONCURRENT_UPLOADS } from './media.constants'
import { MediaService } from './media.service'
import { MemoryStorage } from './storage/memory.storage'

describe('MediaService upload cleanup', () => {
  it('deletes both keys when the thumbnail put rejects', async () => {
    const storage = new MemoryStorage()
    const realPut = storage.put.bind(storage)
    const puts: string[] = []
    jest.spyOn(storage, 'put').mockImplementation(async (key, body, type) => {
      puts.push(key)
      if (key.endsWith('-thumb.webp')) throw new Error('thumb put failed')
      return realPut(key, body, type)
    })
    const deleteSpy = jest.spyOn(storage, 'delete')
    const create = jest.fn()
    const prisma = { media: { create } } as unknown as PrismaService
    const service = new MediaService(prisma, new ImageService(), storage)
    const buffer = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } }).jpeg().toBuffer()

    await expect(service.upload({ buffer, mimetype: 'image/jpeg' }, 'alt', null)).rejects.toThrow('thumb put failed')

    expect(create).not.toHaveBeenCalled()
    expect(deleteSpy.mock.calls.map(([key]) => key).sort()).toEqual([...puts].sort())
    for (const key of puts) expect(storage.has(key)).toBe(false)
  })
})

const MB = 1024 * 1024
const ftypBox = (body = 'isom') => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from(`ftyp${body}`), Buffer.alloc(16)])
const webmHeader = () => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(32)])
const videoBufferFor = (mime: string) => (mime === 'video/webm' ? webmHeader() : ftypBox())

function buildService() {
  const storage = new MemoryStorage()
  const putSpy = jest.spyOn(storage, 'put')
  const deleteSpy = jest.spyOn(storage, 'delete')
  const create = jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'm1', ...data }))
  const findUnique = jest.fn()
  const remove = jest.fn(async () => ({}))
  const images = new ImageService()
  const processSpy = jest.spyOn(images, 'process')
  const prisma = { media: { create, findUnique, delete: remove } } as unknown as PrismaService
  const service = new MediaService(prisma, images, storage)
  return { service, storage, putSpy, deleteSpy, create, findUnique, processSpy }
}

describe('MediaService video upload', () => {
  it.each([
    ['video/mp4', 'mp4'],
    ['video/webm', 'webm'],
    ['video/quicktime', 'mov'],
  ])('stores one object for %s with kind VIDEO, thumbUrl = url and zero dimensions', async (mimetype, ext) => {
    const { service, storage, putSpy, create, processSpy } = buildService()
    const buffer = videoBufferFor(mimetype)

    await service.upload({ buffer, mimetype }, 'A short film', 'u1')

    expect(processSpy).not.toHaveBeenCalled()
    expect(putSpy).toHaveBeenCalledTimes(1)
    const [key, , storedMime] = putSpy.mock.calls[0]!
    expect(key).toMatch(new RegExp(`^arthouz/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.${ext}$`))
    expect(storedMime).toBe(mimetype)
    expect(storage.has(key)).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)
    const data = create.mock.calls[0]![0].data
    expect(data).toMatchObject({
      key,
      url: `memory://${key}`,
      thumbUrl: `memory://${key}`,
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
    const { service, create } = buildService()
    await service.upload({ buffer: Buffer.concat([ftypBox(), Buffer.alloc(30 * MB)]), mimetype: 'video/mp4' }, 'Big', null)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('deletes the single object when the row insert fails', async () => {
    const { service, storage, putSpy, create } = buildService()
    create.mockRejectedValueOnce(new Error('db down'))
    await expect(service.upload({ buffer: webmHeader(), mimetype: 'video/webm' }, 'x', null)).rejects.toThrow('db down')
    expect(storage.has(putSpy.mock.calls[0]![0])).toBe(false)
  })
})

describe('MediaService video signature check', () => {
  it.each([
    ['video/mp4', ftypBox('isom')],
    ['video/quicktime', ftypBox('qt  ')],
    ['video/webm', webmHeader()],
  ])('accepts a valid %s signature', async (mimetype, buffer) => {
    const { service, create } = buildService()
    await service.upload({ buffer, mimetype }, 'ok', null)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['video/mp4', Buffer.from('not-really-a-video')],
    ['video/quicktime', Buffer.concat([Buffer.alloc(4), Buffer.from('moov'), Buffer.alloc(16)])],
    ['video/mp4', webmHeader()],
    ['video/webm', ftypBox()],
    ['video/webm', Buffer.alloc(0)],
    ['video/mp4', Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79])],
  ])('rejects %s with 400 INVALID_VIDEO before storing', async (mimetype, buffer) => {
    const { service, putSpy, create } = buildService()
    const error = await service.upload({ buffer, mimetype }, 'bad', null).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(BadRequestException)
    expect((error as BadRequestException).getResponse()).toMatchObject({ code: 'INVALID_VIDEO' })
    expect(putSpy).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })
})

describe('MediaService upload concurrency cap', () => {
  function gatedService() {
    const ctx = buildService()
    const releases: Array<() => void> = []
    const realPut = MemoryStorage.prototype.put.bind(ctx.storage)
    ctx.putSpy.mockImplementation(
      (key, body, type) => new Promise((resolve) => releases.push(() => resolve(realPut(key, body, type)))),
    )
    return { ...ctx, releases }
  }
  const video = () => ({ buffer: ftypBox(), mimetype: 'video/mp4' })
  const tick = () => new Promise((resolve) => setImmediate(resolve))

  it('returns 429 TOO_MANY_UPLOADS beyond the cap instead of queueing', async () => {
    const { service, releases, putSpy } = gatedService()
    const running = Array.from({ length: MAX_CONCURRENT_UPLOADS }, () => service.upload(video(), 'a', null))
    await tick()
    expect(releases).toHaveLength(MAX_CONCURRENT_UPLOADS)

    const error = await service.upload(video(), 'extra', null).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(HttpException)
    expect((error as HttpException).getStatus()).toBe(429)
    expect((error as HttpException).getResponse()).toMatchObject({ code: 'TOO_MANY_UPLOADS' })
    expect(putSpy).toHaveBeenCalledTimes(MAX_CONCURRENT_UPLOADS)

    releases.forEach((release) => release())
    await Promise.all(running)
  })

  it('frees a slot when an upload finishes', async () => {
    const { service, releases } = gatedService()
    const running = Array.from({ length: MAX_CONCURRENT_UPLOADS }, () => service.upload(video(), 'a', null))
    await tick()
    releases[0]!()
    await running[0]
    const next = service.upload(video(), 'b', null)
    await tick()
    expect(releases).toHaveLength(MAX_CONCURRENT_UPLOADS + 1)
    releases.forEach((release) => release())
    await Promise.all([...running, next])
  })

  it('frees the slot when an upload fails', async () => {
    const { service, create } = buildService()
    create.mockRejectedValue(new Error('db down'))
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS + 2; i += 1) {
      await expect(service.upload(video(), 'x', null)).rejects.toThrow('db down')
    }
  })

  it('frees the slot when validation rejects the file', async () => {
    const { service } = buildService()
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS + 2; i += 1) {
      await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'video/mp4' }, 'x', null)).rejects.toBeInstanceOf(BadRequestException)
    }
  })
})

describe('MediaService image size limit', () => {
  it('accepts an image of exactly 25 MB', async () => {
    const { service, processSpy, create } = buildService()
    processSpy.mockResolvedValue({ width: 10, height: 10, thumb: Buffer.from('t'), ext: 'jpg', mime: 'image/jpeg' })
    await service.upload({ buffer: Buffer.alloc(25 * MB), mimetype: 'image/jpeg' }, 'alt', null)
    expect(processSpy).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('rejects an image over 25 MB with 413 PAYLOAD_TOO_LARGE before decoding or storing', async () => {
    const { service, putSpy, processSpy } = buildService()
    const error = await service
      .upload({ buffer: Buffer.alloc(25 * MB + 1), mimetype: 'image/jpeg' }, 'alt', null)
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PayloadTooLargeException)
    expect((error as PayloadTooLargeException).getResponse()).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' })
    expect(processSpy).not.toHaveBeenCalled()
    expect(putSpy).not.toHaveBeenCalled()
  })

  it('creates images with kind IMAGE', async () => {
    const { service, create } = buildService()
    const buffer = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).png().toBuffer()
    await service.upload({ buffer, mimetype: 'image/png' }, 'alt', null)
    expect(create.mock.calls[0]![0].data).toMatchObject({ kind: 'IMAGE', mime: 'image/png', width: 8, height: 8 })
  })
})

describe('MediaService remove', () => {
  const row = (key: string, kind: 'IMAGE' | 'VIDEO') => ({ id: 'm1', key, kind })
  const usageFree = (service: MediaService) => jest.spyOn(service, 'usage').mockResolvedValue([])

  it('deletes only the original key for a video', async () => {
    const { service, deleteSpy, findUnique } = buildService()
    usageFree(service)
    findUnique.mockResolvedValue(row('arthouz/2026/10/abc.mp4', 'VIDEO'))
    await service.remove('m1')
    expect(deleteSpy.mock.calls.map(([k]) => k)).toEqual(['arthouz/2026/10/abc.mp4'])
  })

  it('deletes the original and thumbnail keys for an image', async () => {
    const { service, deleteSpy, findUnique } = buildService()
    usageFree(service)
    findUnique.mockResolvedValue(row('arthouz/2026/10/abc.jpg', 'IMAGE'))
    await service.remove('m1')
    expect(deleteSpy.mock.calls.map(([k]) => k).sort()).toEqual(['arthouz/2026/10/abc-thumb.webp', 'arthouz/2026/10/abc.jpg'])
  })
})

describe('MediaService list kind filter', () => {
  it('filters by kind when provided', async () => {
    const findMany = jest.fn(async (_args: unknown) => [])
    const count = jest.fn(async () => 0)
    const prisma = { media: { findMany, count } } as unknown as PrismaService
    const service = new MediaService(prisma, new ImageService(), new MemoryStorage())
    await service.list({ kind: 'VIDEO', page: 1, limit: 10, skip: 0 })
    expect(findMany.mock.calls[0]![0]).toMatchObject({ where: { AND: [{ kind: 'VIDEO' }] } })
    await service.list({ page: 1, limit: 10, skip: 0 })
    expect(findMany.mock.calls[1]![0]).toMatchObject({ where: {} })
  })
})
