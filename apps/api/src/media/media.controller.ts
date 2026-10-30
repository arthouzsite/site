import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { mediaPatchSchema, type MediaPatch } from '@arthouz/shared'
import { z } from 'zod'
import { CurrentUser } from '../auth/current-user.decorator'
import type { PublicUser } from '../auth/public-user'
import { withMeta } from '../common/envelope.interceptor'
import { parsePagination } from '../common/pagination'
import { ZodBody } from '../common/zod-body.pipe'
import { ALLOWED_IMAGE_MIMES, ALLOWED_VIDEO_MIMES, MAX_VIDEO_UPLOAD_BYTES } from './media.constants'
import { MediaService } from './media.service'

const uploadSchema = z.object({
  file: z.custom<Express.Multer.File>((v) => Boolean(v), 'File is required'),
  alt: z.string('Alt text is required').trim().min(1, 'Alt text is required').max(500),
})

const listQuerySchema = z.object({
  kind: z.enum(['image', 'video'], 'Kind must be image or video').optional(),
})

const KIND_BY_QUERY = { image: 'IMAGE', video: 'VIDEO' } as const

type FileCallback = (error: Error | null, accept: boolean) => void

function mediaFileFilter(_req: unknown, file: Express.Multer.File, callback: FileCallback): void {
  if (!ALLOWED_IMAGE_MIMES.includes(file.mimetype) && !ALLOWED_VIDEO_MIMES.includes(file.mimetype)) {
    callback(new UnsupportedMediaTypeException(`Unsupported file type ${file.mimetype}`), false)
    return
  }
  callback(null, true)
}

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES }, fileFilter: mediaFileFilter }))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { alt?: unknown },
    @CurrentUser() user: PublicUser,
  ) {
    const input = uploadSchema.parse({ file, alt: body?.alt })
    return this.media.upload(input.file, input.alt, user.id)
  }

  @Get()
  async list(@Query() query: { q?: string; page?: string; limit?: string; missingAlt?: string; kind?: string }) {
    const { kind } = listQuerySchema.parse({ kind: query.kind })
    const pagination = parsePagination(query)
    const { items, total } = await this.media.list({
      q: query.q?.trim() || undefined,
      missingAlt: query.missingAlt === 'true',
      kind: kind ? KIND_BY_QUERY[kind] : undefined,
      ...pagination,
    })
    return withMeta(items, { total, page: pagination.page, limit: pagination.limit })
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.media.get(id)
  }

  @Patch(':id')
  patch(@Param('id') id: string, @ZodBody(mediaPatchSchema) body: MediaPatch) {
    return this.media.patch(id, body)
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string) {
    await this.media.remove(id)
    return { id }
  }
}
