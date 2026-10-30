import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import sharp, { type Metadata } from 'sharp'
import { THUMB_QUALITY, THUMB_WIDTH } from './media.constants'

export type ImageExt = 'jpg' | 'png' | 'webp' | 'avif'
export type ProcessedImage = { width: number; height: number; thumb: Buffer; ext: ImageExt; mime: string }

const MIME_BY_EXT: Readonly<Record<ImageExt, string>> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}
const SWAPPED_ORIENTATION_MIN = 5
const EXT_BY_FORMAT: Readonly<Record<string, ImageExt>> = { jpeg: 'jpg', png: 'png', webp: 'webp', heif: 'avif' }
const AVIF_COMPRESSION = 'av1'

// sharp reports HEIC and AVIF both as "heif"; only the av1 compression is AVIF.
function extFor(meta: Metadata): ImageExt | undefined {
  if (!meta.format) return undefined
  if (meta.format === 'heif' && meta.compression !== AVIF_COMPRESSION) return undefined
  return EXT_BY_FORMAT[meta.format]
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name)

  async process(buf: Buffer): Promise<ProcessedImage> {
    const { meta, thumb } = await this.decode(buf)
    const ext = extFor(meta)
    if (!ext) {
      this.logger.warn(`Rejected unsupported image format: ${meta.format}`)
      throw this.invalidImage()
    }
    const isSwapped = (meta.orientation ?? 1) >= SWAPPED_ORIENTATION_MIN
    const width = meta.width ?? 0
    const height = meta.height ?? 0
    return { width: isSwapped ? height : width, height: isSwapped ? width : height, thumb, ext, mime: MIME_BY_EXT[ext] }
  }

  // Only sharp decode failures map to INVALID_IMAGE; anything else propagates as a 500.
  private async decode(buf: Buffer): Promise<{ meta: Metadata; thumb: Buffer }> {
    try {
      const meta = await sharp(buf).metadata()
      if (!extFor(meta)) return { meta, thumb: Buffer.alloc(0) }
      const thumb = await sharp(buf)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer()
      return { meta, thumb }
    } catch (error) {
      if (!isDecodeError(error)) throw error
      this.logger.warn(`Image decode failed: ${error.message}`)
      throw this.invalidImage()
    }
  }

  private invalidImage(): BadRequestException {
    return new BadRequestException({ code: 'INVALID_IMAGE', message: 'File is not a valid jpeg, png, webp or avif image' })
  }
}

function isDecodeError(error: unknown): error is Error {
  return error instanceof Error && /unsupported image format|corrupt|Input (buffer|file)|VipsJpeg|vips|heif|webp|png|bad seek/i.test(error.message)
}
