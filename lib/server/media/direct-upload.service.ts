import { imageLimitError } from '@/lib/shared'
import { ApiException, badRequest, conflict, payloadTooLarge, unsupportedMediaType } from '@/lib/server/http/errors'
import type { Media } from '@/lib/server/generated/prisma/client'
import { prisma } from '@/lib/server/prisma'
import { VIDEO_SIGNATURE_BYTES } from './media.constants'
import { processImage } from './image.service'
import { cleanup, recordImage, recordVideo } from './media.service'
import { getStorage } from './storage/storage.provider'
import type { StoredObjectInfo, UploadTarget } from './storage/storage.interface'
import { allocateUploadKey, extForMime, extOfKey } from './upload-keys'
import { assertUploadAllowed, type CompleteUploadInput, type CreateUploadInput } from './upload-request'
import { withUploadSlot } from './upload-slots'
import { hasVideoSignature, isVideoMime } from './video-signature'

export type UploadGrant = UploadTarget & { key: string }

/** Step 1: checks what the browser is about to send and hands back where to send it. */
export async function createUpload(input: CreateUploadInput): Promise<UploadGrant> {
  assertUploadAllowed({ type: input.mime, size: input.bytes })
  const key = allocateUploadKey(input.mime)
  return { key, ...(await getStorage().createUploadTarget(key, input.mime, input.bytes)) }
}

// Anything the client got wrong about the stored object is removed, so a rejected upload leaves nothing behind.
async function deleteIfRejected<T>(key: string, task: () => Promise<T> | T): Promise<T> {
  try {
    return await task()
  } catch (error) {
    if (error instanceof ApiException) await cleanup([key])
    throw error
  }
}

function assertStoredObjectAllowed(key: string, stored: StoredObjectInfo): void {
  if (stored.bytes <= 0) throw badRequest('EMPTY_UPLOAD', 'The uploaded file is empty')
  assertUploadAllowed({ type: stored.contentType, size: stored.bytes })
  if (extForMime(stored.contentType) !== extOfKey(key)) {
    throw unsupportedMediaType('The uploaded file type does not match the upload')
  }
}

async function completeVideo(upload: CompleteUploadInput, mime: string, bytes: number, userId: string | null): Promise<Media> {
  const { key, alt, filename } = upload
  const storage = getStorage()
  await deleteIfRejected(key, async () => {
    const head = await storage.getRange(key, 0, VIDEO_SIGNATURE_BYTES - 1)
    if (!isVideoMime(mime) || !hasVideoSignature(head, mime)) throw badRequest('INVALID_VIDEO', 'File is not a valid video')
  })
  return recordVideo({ key, url: storage.urlFor(key), filename }, mime, bytes, alt, userId)
}

function completeImage({ key, alt, filename }: CompleteUploadInput, userId: string | null): Promise<Media> {
  return withUploadSlot(async () => {
    const storage = getStorage()
    const buffer = await storage.get(key)
    // The object can change between head and get, so the limit holds for the bytes actually read.
    const processed = await deleteIfRejected(key, () => {
      const problem = imageLimitError({ bytes: buffer.length })
      if (problem) throw payloadTooLarge(problem)
      return processImage(buffer)
    })
    return recordImage({ key, url: storage.urlFor(key), filename }, processed, buffer.length, alt, userId)
  })
}

/** Throws 409 when the key already has a Media row: its object must not be replaced or completed again. */
export async function assertNotCompleted(key: string): Promise<void> {
  if (await prisma.media.findUnique({ where: { key }, select: { id: true } })) {
    throw conflict('UPLOAD_ALREADY_COMPLETED', 'This upload has already been completed')
  }
}

/** Step 3: verifies the object the browser put in storage and records it as a Media row. */
export async function completeUpload(input: CompleteUploadInput, userId: string | null): Promise<Media> {
  const { key } = input
  await assertNotCompleted(key)
  const stored = await getStorage().head(key)
  if (!stored) throw badRequest('UPLOAD_NOT_FOUND', 'No uploaded file was found for this key')
  await deleteIfRejected(key, () => assertStoredObjectAllowed(key, stored))
  return isVideoMime(stored.contentType)
    ? completeVideo(input, stored.contentType, stored.bytes, userId)
    : completeImage(input, userId)
}
