import sharp from 'sharp'
import type { PrismaService } from '../common/prisma.service'
import { ImageService } from './image.service'
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

    await expect(service.upload({ buffer }, 'alt', null)).rejects.toThrow('thumb put failed')

    expect(create).not.toHaveBeenCalled()
    expect(deleteSpy.mock.calls.map(([key]) => key).sort()).toEqual([...puts].sort())
    for (const key of puts) expect(storage.has(key)).toBe(false)
  })
})
