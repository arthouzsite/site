import { BadRequestException } from '@nestjs/common'
import type { PrismaService } from './prisma.service'

const UNKNOWN_MEDIA = 'UNKNOWN_MEDIA'
const INVALID_MEDIA_KIND = 'INVALID_MEDIA_KIND'

/** Content fields that reference media only render images, so the row must exist and be an IMAGE. */
export async function assertMediaExists(prisma: PrismaService, mediaId: string | null | undefined, label = 'image'): Promise<void> {
  if (!mediaId) return
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true, kind: true } })
  if (!media) throw new BadRequestException({ code: UNKNOWN_MEDIA, message: `Unknown ${label}: ${mediaId}` })
  if (media.kind !== 'IMAGE') throw new BadRequestException({ code: INVALID_MEDIA_KIND, message: `${label} must be an image` })
}
