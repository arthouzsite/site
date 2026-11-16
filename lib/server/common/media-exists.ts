import { badRequest } from '@/lib/server/http/errors'
import type { PrismaClient } from '@/lib/server/generated/prisma/client'

const UNKNOWN_MEDIA = 'UNKNOWN_MEDIA'
const INVALID_MEDIA_KIND = 'INVALID_MEDIA_KIND'

/** Content fields that reference media only render images, so the row must exist and be an IMAGE. */
export async function assertMediaExists(prisma: PrismaClient, mediaId: string | null | undefined, label = 'image'): Promise<void> {
  if (!mediaId) return
  const media = await prisma.media.findUnique({ where: { id: mediaId }, select: { id: true, kind: true } })
  if (!media) throw badRequest(UNKNOWN_MEDIA, `Unknown ${label}: ${mediaId}`)
  if (media.kind !== 'IMAGE') throw badRequest(INVALID_MEDIA_KIND, `${label} must be an image`)
}

/** Every id must exist and be an IMAGE; one query for the lot. Duplicates are the caller's concern. */
export async function assertMediaIdsExist(prisma: PrismaClient, mediaIds: readonly string[], label = 'image'): Promise<void> {
  if (mediaIds.length === 0) return
  const rows = await prisma.media.findMany({ where: { id: { in: [...mediaIds] } }, select: { id: true, kind: true } })
  const byId = new Map(rows.map((r) => [r.id, r.kind]))
  const missing = mediaIds.find((id) => !byId.has(id))
  if (missing) throw badRequest(UNKNOWN_MEDIA, `Unknown ${label}: ${missing}`)
  if (rows.some((r) => r.kind !== 'IMAGE')) throw badRequest(INVALID_MEDIA_KIND, `${label} must be an image`)
}
