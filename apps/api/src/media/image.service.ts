import { BadRequestException, Injectable } from '@nestjs/common'
import sharp from 'sharp'
import { THUMB_QUALITY, THUMB_WIDTH } from './media.constants'

export type ImageExt = 'jpg' | 'png' | 'webp' | 'avif'
export type ProcessedImage = { width: number; height: number; thumb: Buffer; ext: ImageExt }

const SWAPPED_ORIENTATION_MIN = 5
const EXT_BY_FORMAT: Readonly<Record<string, ImageExt>> = { jpeg: 'jpg', png: 'png', webp: 'webp', heif: 'avif' }

@Injectable()
export class ImageService {
  async process(buf: Buffer): Promise<ProcessedImage> {
    try {
      const { format } = await sharp(buf).metadata()
      const ext = format ? EXT_BY_FORMAT[format] : undefined
      if (!ext) throw new Error(`unsupported format ${format}`)
      const meta = await sharp(buf).metadata()
      const isSwapped = (meta.orientation ?? 1) >= SWAPPED_ORIENTATION_MIN
      const thumb = await sharp(buf)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer()
      const width = meta.width ?? 0
      const height = meta.height ?? 0
      return { width: isSwapped ? height : width, height: isSwapped ? width : height, thumb, ext }
    } catch {
      throw new BadRequestException({ code: 'INVALID_IMAGE', message: 'File is not a valid jpeg, png, webp or avif image' })
    }
  }
}
