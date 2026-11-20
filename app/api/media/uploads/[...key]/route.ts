import { env } from '@/lib/server/env'
import { assertNotCompleted } from '@/lib/server/media/direct-upload.service'
import { badGateway, badRequest, unsupportedMediaType } from '@/lib/server/http/errors'
import { route } from '@/lib/server/http/route'
import { MAX_SERVER_UPLOAD_BYTES } from '@/lib/server/media/media.constants'
import { extForMime, extOfKey, isUploadKey } from '@/lib/server/media/upload-keys'
import { getStorage, memoryStorage } from '@/lib/server/media/storage/storage.provider'
import { assertUploadAllowed, MAX_BODY_BYTES, readBoundedBody } from '@/lib/server/media/upload-request'

const TOO_LARGE_FOR_SERVER = 'This file is too large to upload through the server'

/** The storage's own error name (AccessDenied, InvalidAccessKeyId, ...): safe to show and enough to tell what to fix. */
function storageErrorName(error: unknown): string {
  return error instanceof Error && error.name ? error.name : 'unknown error'
}

/** With the bucket driver the app writes the file to the bucket itself; the complete step then checks what was stored. */
async function storeInBucket(request: Request, key: string, contentType: string): Promise<void> {
  const body = await readBoundedBody(request, MAX_SERVER_UPLOAD_BYTES, TOO_LARGE_FOR_SERVER)
  if (body.length === 0) throw badRequest('EMPTY_UPLOAD', 'The uploaded file is empty')
  assertUploadAllowed({ type: contentType, size: body.length })
  await getStorage().put(key, body, contentType).catch((error: unknown) => {
    throw badGateway('STORAGE_WRITE_FAILED', `The file storage did not accept the file (${storageErrorName(error)})`)
  })
}

/** The memory driver (tests, local runs without a bucket) holds the body to the size declared when the upload was created. */
async function storeInMemory(request: Request, key: string, contentType: string): Promise<void> {
  const declared = memoryStorage.declaredSize(key)
  if (declared === undefined) throw badRequest('UPLOAD_NOT_ALLOCATED', 'No upload was created for this key')
  const body = await readBoundedBody(request, MAX_BODY_BYTES)
  if (body.length !== declared) throw badRequest('UPLOAD_SIZE_MISMATCH', `Expected ${declared} bytes but received ${body.length}`)
  await memoryStorage.put(key, body, contentType)
}

/**
 * Step 2 of an upload: the browser sends the file here and the app stores it, so the browser never talks to the
 * bucket. Only files too large for a request body (videos over 4 MB) are sent to the bucket's presigned URL instead.
 */
export const PUT = route<{ key: string[] }>('user', async ({ request, params }) => {
  const key = params.key.join('/')
  if (!isUploadKey(key)) throw badRequest('INVALID_KEY', 'Not a valid upload key')
  const contentType = request.headers.get('content-type') ?? ''
  if (extForMime(contentType) !== extOfKey(key)) throw unsupportedMediaType('The content type does not match the upload')
  await assertNotCompleted(key)
  if (env.STORAGE_DRIVER === 'r2') await storeInBucket(request, key, contentType)
  else await storeInMemory(request, key, contentType)
  return null
})
