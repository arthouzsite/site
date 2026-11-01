import { randomUUID } from 'node:crypto'
import type { MediaPatch } from '@/lib/shared'
import { Prisma, type Media, type MediaKind } from '@/lib/server/generated/prisma/client'
import { badRequest, conflict, notFound } from '@/lib/server/http/errors'
import { logError } from '@/lib/server/log'
import { prisma } from '@/lib/server/prisma'
import { revalidateSite } from '@/lib/server/revalidate'
import { processImage, type ProcessedImage } from './image.service'
import { KEY_PREFIX, VIDEO_EXT_BY_MIME, type VideoMime } from './media.constants'
import { findMediaUsage, type MediaUsage } from './media.usage'
import { getStorage } from './storage/storage.provider'
import { mediaUsageTags } from '@/lib/server/revalidate/related-tags'
import { hasVideoSignature, isVideoMime } from './video-signature'

export type MediaListQuery = { q?: string; missingAlt?: boolean; kind?: MediaKind; page: number; limit: number; skip: number }
const PRISMA_UNIQUE_VIOLATION = 'P2002'

/** The bytes and declared type of an upload, already checked for type and size by the route. */
export type UploadedFile = { buffer: Buffer; mimetype: string }

function buildKeys(ext: string, now: Date): { key: string } {
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  return { key: `${KEY_PREFIX}/${yyyy}/${mm}/${randomUUID()}.${ext}` }
}

export function thumbKeyOf(key: string): string {
  return key.replace(/\.[^./]+$/, '-thumb.webp')
}

export async function cleanup(keys: string[]): Promise<void> {
  const storage = getStorage()
  await Promise.all(
    keys.map((k) => storage.delete(k).catch((e: unknown) => logError(`cleanup failed for ${k}`, String(e)))),
  )
}

/** An original already in storage: its key and public URL. */
export type StoredOriginal = { key: string; url: string }

const isDuplicateKey = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_VIOLATION

// The row insert is the last step of every upload: if it fails the stored objects are orphans and are removed,
// unless the key already has a row, in which case those objects belong to it.
async function createRow(data: Prisma.MediaUncheckedCreateInput, orphanKeys: string[]): Promise<Media> {
  try {
    return await prisma.media.create({ data })
  } catch (error) {
    if (isDuplicateKey(error)) throw conflict('UPLOAD_ALREADY_COMPLETED', 'This upload has already been completed')
    await cleanup(orphanKeys)
    throw error
  }
}

/** Records a video whose bytes are already stored. Videos get no thumbnail: the admin grid renders the video itself. */
export function recordVideo(original: StoredOriginal, mime: string, bytes: number, alt: string, userId: string | null): Promise<Media> {
  return createRow(
    { key: original.key, url: original.url, thumbUrl: original.url, width: 0, height: 0, mime, kind: 'VIDEO', bytes, alt, uploadedById: userId },
    [original.key],
  )
}

/** Stores the thumbnail next to an image whose original is already stored, then records it. */
export async function recordImage(
  original: StoredOriginal,
  processed: ProcessedImage,
  bytes: number,
  alt: string,
  userId: string | null,
): Promise<Media> {
  const thumbKey = thumbKeyOf(original.key)
  const orphans = [original.key, thumbKey]
  let thumb: { url: string }
  try {
    thumb = await getStorage().put(thumbKey, processed.thumb, 'image/webp')
  } catch (error) {
    await cleanup(orphans)
    throw error
  }
  return createRow(
    {
      key: original.key,
      url: original.url,
      thumbUrl: thumb.url,
      width: processed.width,
      height: processed.height,
      mime: processed.mime,
      kind: 'IMAGE',
      bytes,
      alt,
      uploadedById: userId,
    },
    orphans,
  )
}

async function uploadVideo(file: UploadedFile, mime: VideoMime, alt: string, userId: string | null): Promise<Media> {
  if (!hasVideoSignature(file.buffer, mime)) throw badRequest('INVALID_VIDEO', 'File is not a valid video')
  const { key } = buildKeys(VIDEO_EXT_BY_MIME[mime], new Date())
  const stored = await getStorage().put(key, file.buffer, file.mimetype)
  return recordVideo({ key, url: stored.url }, file.mimetype, file.buffer.length, alt, userId)
}

async function uploadImage(file: UploadedFile, alt: string, userId: string | null): Promise<Media> {
  const processed = await processImage(file.buffer)
  const { key } = buildKeys(processed.ext, new Date())
  const original = await getStorage().put(key, file.buffer, processed.mime)
  return recordImage({ key, url: original.url }, processed, file.buffer.length, alt, userId)
}

export function upload(file: UploadedFile, alt: string, userId: string | null): Promise<Media> {
  return isVideoMime(file.mimetype) ? uploadVideo(file, file.mimetype, alt, userId) : uploadImage(file, alt, userId)
}

export async function list(query: MediaListQuery): Promise<{ items: Media[]; total: number }> {
  const filters: Prisma.MediaWhereInput[] = []
  if (query.q) {
    filters.push({ OR: [{ key: { contains: query.q, mode: 'insensitive' } }, { alt: { contains: query.q, mode: 'insensitive' } }] })
  }
  if (query.missingAlt) filters.push({ alt: '' })
  if (query.kind) filters.push({ kind: query.kind })
  const where: Prisma.MediaWhereInput = filters.length ? { AND: filters } : {}
  const [items, total] = await Promise.all([
    prisma.media.findMany({ where, orderBy: { createdAt: 'desc' }, skip: query.skip, take: query.limit }),
    prisma.media.count({ where }),
  ])
  return { items, total }
}

export function usage(id: string): Promise<MediaUsage[]> {
  return findMediaUsage(prisma, id)
}

async function find(id: string): Promise<Media> {
  const media = await prisma.media.findUnique({ where: { id } })
  if (!media) throw notFound('Media not found')
  return media
}

export async function get(id: string): Promise<Media & { usedBy: MediaUsage[] }> {
  const media = await find(id)
  return { ...media, usedBy: await usage(id) }
}

// Alt and caption render on every page that shows the media, so refresh those pages. Never fails the edit.
async function revalidateUsers(id: string): Promise<void> {
  try {
    revalidateSite(await mediaUsageTags(prisma, await usage(id)))
  } catch (error) {
    logError(`Could not revalidate pages using media ${id}: ${String(error)}`)
  }
}

export async function patch(id: string, input: MediaPatch): Promise<Media> {
  await find(id)
  const updated = await prisma.media.update({
    where: { id },
    data: { alt: input.alt, ...(input.caption !== undefined && { caption: input.caption }) },
  })
  await revalidateUsers(id)
  return updated
}

export async function remove(id: string): Promise<void> {
  const media = await find(id)
  const usedBy = await usage(id)
  if (usedBy.length > 0) throw conflict('MEDIA_IN_USE', 'Media is used by other content', { usedBy })
  await prisma.media.delete({ where: { id } })
  const storage = getStorage()
  await storage.delete(media.key)
  if (media.kind === 'IMAGE') await storage.delete(thumbKeyOf(media.key))
}
