import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logError } from '@/lib/server/log'
import { processImage, toProcessedImage } from './image.service'

vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

const SOURCE_WIDTH = 1600
const SOURCE_HEIGHT = 1200
const EXPECTED_THUMB_WIDTH = 480

async function jpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  const base = sharp({ create: { width, height, channels: 3, background: '#cc8844' } }).jpeg()
  return (orientation ? base.withMetadata({ orientation }) : base).toBuffer()
}

describe('processImage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns dimensions and a 480-wide webp thumb', async () => {
    const result = await processImage(await jpeg(SOURCE_WIDTH, SOURCE_HEIGHT))
    const thumb = await sharp(result.thumb).metadata()
    expect(result).toMatchObject({ width: SOURCE_WIDTH, height: SOURCE_HEIGHT, ext: 'jpg', mime: 'image/jpeg' })
    expect(thumb.format).toBe('webp')
    expect(thumb.width).toBe(EXPECTED_THUMB_WIDTH)
  })

  it('does not enlarge small images', async () => {
    const png = await sharp({ create: { width: 100, height: 80, channels: 3, background: '#fff' } }).png().toBuffer()
    const result = await processImage(png)
    expect(result.ext).toBe('png')
    expect((await sharp(result.thumb).metadata()).width).toBe(100)
  })

  it('reports dimensions after auto-orientation', async () => {
    const result = await processImage(await jpeg(SOURCE_WIDTH, SOURCE_HEIGHT, 6))
    expect(result).toMatchObject({ width: SOURCE_HEIGHT, height: SOURCE_WIDTH })
  })

  it('detects webp and avif', async () => {
    const raw = { create: { width: 64, height: 64, channels: 3 as const, background: '#123456' } }
    expect((await processImage(await sharp(raw).webp().toBuffer())).ext).toBe('webp')
    expect((await processImage(await sharp(raw).avif().toBuffer())).ext).toBe('avif')
  })

  it('rejects buffers that are not images', async () => {
    await expect(processImage(Buffer.from('definitely not an image'))).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_IMAGE',
    })
    expect(logError).toHaveBeenCalled()
  })

  it('rejects image formats outside the allowed set', async () => {
    const gif = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#000' } }).gif().toBuffer()
    await expect(processImage(gif)).rejects.toMatchObject({ status: 400, code: 'INVALID_IMAGE' })
  })
})

describe('toProcessedImage heif container', () => {
  const heif = (compression: string | undefined) => ({ format: 'heif' as const, compression, width: 10, height: 8 })

  it('maps heif with av1 compression to avif', () => {
    expect(toProcessedImage(heif('av1') as never, Buffer.alloc(1))).toMatchObject({ ext: 'avif', mime: 'image/avif' })
  })

  it.each(['hevc', undefined])('rejects heif with %s compression as INVALID_IMAGE', (compression) => {
    expect(() => toProcessedImage(heif(compression) as never, Buffer.alloc(1))).toThrow(
      expect.objectContaining({ status: 400, code: 'INVALID_IMAGE' }),
    )
  })
})
