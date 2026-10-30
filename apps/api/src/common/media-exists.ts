import { BadRequestException } from '@nestjs/common'
import type { PrismaService } from './prisma.service'

const UNKNOWN_MEDIA = 'UNKNOWN_MEDIA'

export async function assertMediaExists(prisma: PrismaService, mediaId: string | null | undefined, label = 'image'): Promise<void> {
  if (!mediaId) return
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true } })
  if (!media) throw new BadRequestException({ code: UNKNOWN_MEDIA, message: `Unknown ${label}: ${mediaId}` })
}
