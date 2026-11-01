import { env } from '@/lib/server/env'
import { assertNotCompleted } from '@/lib/server/media/direct-upload.service'
import { badRequest, notFound, unsupportedMediaType } from '@/lib/server/http/errors'
import { route } from '@/lib/server/http/route'
import { extForMime, extOfKey, isUploadKey } from '@/lib/server/media/upload-keys'
import { memoryStorage } from '@/lib/server/media/storage/storage.provider'
import { MAX_BODY_BYTES, readBoundedBody } from '@/lib/server/media/upload-request'

/**
 * Step 2 for the memory driver only: the same-origin stand-in for a presigned bucket URL, so local runs and tests
 * need no R2 account. With the r2 driver the browser PUTs to the bucket and this endpoint does not exist.
 */
export const PUT = route<{ key: string[] }>('user', async ({ request, params }) => {
  if (env.STORAGE_DRIVER === 'r2') throw notFound('No such endpoint')
  const key = params.key.join('/')
  if (!isUploadKey(key)) throw badRequest('INVALID_KEY', 'Not a valid upload key')
  const contentType = request.headers.get('content-type') ?? ''
  if (extForMime(contentType) !== extOfKey(key)) throw unsupportedMediaType('The content type does not match the upload')
  const declared = memoryStorage.declaredSize(key)
  if (declared === undefined) throw badRequest('UPLOAD_NOT_ALLOCATED', 'No upload was created for this key')
  await assertNotCompleted(key)
  const body = await readBoundedBody(request, MAX_BODY_BYTES)
  if (body.length !== declared) throw badRequest('UPLOAD_SIZE_MISMATCH', `Expected ${declared} bytes but received ${body.length}`)
  await memoryStorage.put(key, body, contentType)
  return null
})
