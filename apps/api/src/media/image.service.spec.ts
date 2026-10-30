import { Logger } from '@nestjs/common'
import sharp from 'sharp'
import { ImageService } from './image.service'

const SOURCE_WIDTH = 1600
const SOURCE_HEIGHT = 1200
const EXPECTED_THUMB_WIDTH = 480

async function jpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  const base = sharp({ create: { width, height, channels: 3, background: '#cc8844' } }).jpeg()
  return (orientation ? base.withMetadata({ orientation }) : base).toBuffer()
}

describe('ImageService', () => {
  const service = new ImageService()
  let warn: jest.SpyInstance

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
  })
  afterEach(() => jest.restoreAllMocks())

  it('process returns dimensions and a 480-wide webp thumb', async () => {
    const result = await service.process(await jpeg(SOURCE_WIDTH, SOURCE_HEIGHT))
    const thumb = await sharp(result.thumb).metadata()
    expect(result).toMatchObject({ width: SOURCE_WIDTH, height: SOURCE_HEIGHT, ext: 'jpg', mime: 'image/jpeg' })
    expect(thumb.format).toBe('webp')
    expect(thumb.width).toBe(EXPECTED_THUMB_WIDTH)
  })

  it('does not enlarge small images', async () => {
    const png = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#fff' } }).png().toBuffer()
    const result = await service.process(png)
    expect(result.ext).toBe('png')
    expect((await sharp(result.thumb).metadata()).width).toBe(100)
  })

  it('reports dimensions after auto-orientation', async () => {
    const result = await service.process(await jpeg(SOURCE_WIDTH, SOURCE_HEIGHT, 6))
    expect(result).toMatchObject({ width: SOURCE_HEIGHT, height: SOURCE_WIDTH })
  })

  it('detects webp and avif', async () => {
    const raw = { create: { width: 64, height: 64, channels: 3 as const, background: '#123456' } }
    expect((await service.process(await sharp(raw).webp().toBuffer())).ext).toBe('webp')
    expect((await service.process(await sharp(raw).avif().toBuffer())).ext).toBe('avif')
  })

  it('rejects buffers that are not images', async () => {
    await expect(service.process(Buffer.from('definitely not an image'))).rejects.toMatchObject({
      status: 400,
      response: { code: 'INVALID_IMAGE' },
    })
    expect(warn).toHaveBeenCalled()
  })

  it('rejects image formats outside the allowed set', async () => {
    const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).gif().toBuffer()
    await expect(service.process(gif)).rejects.toMatchObject({ status: 400 })
  })
})
