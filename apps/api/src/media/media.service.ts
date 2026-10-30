import { ConflictException, Inject, Injectable, Logger, NotFoundException, PayloadTooLargeException } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { MediaPatch } from '@arthouz/shared'
import { PrismaService } from '../common/prisma.service'
import type { Media, MediaKind, Prisma } from '../generated/prisma/client'
import { ImageService } from './image.service'
import { ALLOWED_VIDEO_MIMES, KEY_PREFIX, MAX_IMAGE_UPLOAD_BYTES, VIDEO_EXT_BY_MIME } from './media.constants'
import { findMediaUsage, type MediaUsage } from './media.usage'
import { STORAGE, type Storage } from './storage/storage.interface'

export type MediaListQuery = { q?: string; missingAlt?: boolean; kind?: MediaKind; page: number; limit: number; skip: number }
export type UploadedFile = { buffer: Buffer; mimetype: string }

function buildKeys(ext: string, now: Date): { key: string; thumbKey: string } {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const base = `${KEY_PREFIX}/${yyyy}/${mm}/${randomUUID()}`
  return { key: `${base}.${ext}`, thumbKey: `${base}-thumb.webp` }
}

function thumbKeyOf(key: string): string {
  return key.replace(/\.[^./]+$/, '-thumb.webp')
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageService,
    @Inject(STORAGE) private readonly storage: Storage,
  ) {}

  async upload(file: UploadedFile, alt: string, userId: string | null): Promise<Media> {
    if (ALLOWED_VIDEO_MIMES.includes(file.mimetype)) return this.uploadVideo(file, alt, userId)
    return this.uploadImage(file, alt, userId)
  }

  private async uploadVideo(file: UploadedFile, alt: string, userId: string | null): Promise<Media> {
    const ext = VIDEO_EXT_BY_MIME[file.mimetype] ?? 'mp4'
    const { key } = buildKeys(ext, new Date())
    const stored = await this.storage.put(key, file.buffer, file.mimetype)
    try {
      return await this.prisma.media.create({
        data: {
          key,
          url: stored.url,
          // No poster frames: the admin grid renders the video itself.
          thumbUrl: stored.url,
          width: 0,
          height: 0,
          mime: file.mimetype,
          kind: 'VIDEO',
          bytes: file.buffer.length,
          alt,
          uploadedById: userId,
        },
      })
    } catch (error) {
      await this.cleanup([key])
      throw error
    }
  }

  private async uploadImage(file: UploadedFile, alt: string, userId: string | null): Promise<Media> {
    if (file.buffer.length > MAX_IMAGE_UPLOAD_BYTES) {
      throw new PayloadTooLargeException({
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Images must be 25 MB or smaller',
      })
    }
    const processed = await this.images.process(file.buffer)
    const { key, thumbKey } = buildKeys(processed.ext, new Date())
    const original = await this.storage.put(key, file.buffer, processed.mime)
    try {
      const thumb = await this.storage.put(thumbKey, processed.thumb, 'image/webp')
      return await this.prisma.media.create({
        data: {
          key,
          url: original.url,
          thumbUrl: thumb.url,
          width: processed.width,
          height: processed.height,
          mime: processed.mime,
          kind: 'IMAGE',
          bytes: file.buffer.length,
          alt,
          uploadedById: userId,
        },
      })
    } catch (error) {
      await this.cleanup([key, thumbKey])
      throw error
    }
  }

  async list(query: MediaListQuery): Promise<{ items: Media[]; total: number }> {
    const filters: Prisma.MediaWhereInput[] = []
    if (query.q) {
      filters.push({ OR: [{ key: { contains: query.q, mode: 'insensitive' } }, { alt: { contains: query.q, mode: 'insensitive' } }] })
    }
    if (query.missingAlt) filters.push({ alt: '' })
    if (query.kind) filters.push({ kind: query.kind })
    const where: Prisma.MediaWhereInput = filters.length ? { AND: filters } : {}
    const [items, total] = await Promise.all([
      this.prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, skip: query.skip, take: query.limit }),
      this.prisma.media.count({ where }),
    ])
    return { items, total }
  }

  async get(id: string): Promise<Media & { usedBy: MediaUsage[] }> {
    const media = await this.find(id)
    return { ...media, usedBy: await this.usage(id) }
  }

  async patch(id: string, input: MediaPatch): Promise<Media> {
    await this.find(id)
    return this.prisma.media.update({
      where: { id },
      data: { alt: input.alt, ...(input.caption !== undefined && { caption: input.caption }) },
    })
  }

  usage(id: string): Promise<MediaUsage[]> {
    return findMediaUsage(this.prisma, id)
  }

  async remove(id: string): Promise<void> {
    const media = await this.find(id)
    const usedBy = await this.usage(id)
    if (usedBy.length > 0) {
      throw new ConflictException({ code: 'MEDIA_IN_USE', message: 'Media is used by other content', details: { usedBy } })
    }
    await this.prisma.media.delete({ where: { id } })
    await this.storage.delete(media.key)
    if (media.kind === 'IMAGE') await this.storage.delete(thumbKeyOf(media.key))
  }

  private async find(id: string): Promise<Media> {
    const media = await this.prisma.media.findUnique({ where: { id } })
    if (!media) throw new NotFoundException('Media not found')
    return media
  }

  private async cleanup(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map((k) => this.storage.delete(k).catch((e: unknown) => this.logger.error(`cleanup failed for ${k}`, String(e)))),
    )
  }
}
