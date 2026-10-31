import { z } from 'zod'
import { badRequest, payloadTooLarge, unsupportedMediaType } from '@/lib/server/http/errors'
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  MULTIPART_OVERHEAD_BYTES,
} from './media.constants'

const MAX_ALT_LENGTH = 500

const uploadSchema = z.object({
  file: z.custom<File>((value) => value instanceof File, 'File is required'),
  alt: z.string('Alt text is required').trim().min(1, 'Alt text is required').max(MAX_ALT_LENGTH),
})

export type UploadForm = z.infer<typeof uploadSchema>

const IMAGE_TOO_LARGE = 'Images must be 25 MB or smaller'
const VIDEO_TOO_LARGE = 'Videos must be 200 MB or smaller'

/** Rejects by declared type and size, from metadata alone: nothing is read into memory, decoded or stored. */
export function assertUploadAllowed(file: { type: string; size: number }): void {
  if (ALLOWED_IMAGE_MIMES.includes(file.type)) {
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) throw payloadTooLarge(IMAGE_TOO_LARGE)
    return
  }
  if (ALLOWED_VIDEO_MIMES.includes(file.type)) {
    if (file.size > MAX_VIDEO_UPLOAD_BYTES) throw payloadTooLarge(VIDEO_TOO_LARGE)
    return
  }
  throw unsupportedMediaType(`Unsupported file type ${file.type}`)
}

const MAX_BODY_BYTES = MAX_VIDEO_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES

function assertDeclaredLength(request: Request): void {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw payloadTooLarge(VIDEO_TOO_LARGE)
  }
}

/** Passes bytes through and errors the stream (cancelling the source) once more than `limit` have gone by. */
function limitBytes(limit: number, onExceeded: () => void): TransformStream<Uint8Array, Uint8Array> {
  let seen = 0
  return new TransformStream({
    transform(chunk, controller) {
      seen += chunk.byteLength
      if (seen > limit) {
        onExceeded()
        controller.error(new Error('Upload body too large'))
        return
      }
      controller.enqueue(chunk)
    },
  })
}

/**
 * Parses the multipart body while counting bytes, so a chunked request with no Content-Length cannot be
 * buffered without bound; the declared length (when present) is only an early exit.
 */
async function readForm(request: Request): Promise<FormData> {
  let isTooLarge = false
  const counted = request.body?.pipeThrough(limitBytes(MAX_BODY_BYTES, () => (isTooLarge = true))) ?? null
  try {
    return await new Response(counted, { headers: request.headers }).formData()
  } catch {
    if (isTooLarge) throw payloadTooLarge(VIDEO_TOO_LARGE)
    throw badRequest('BAD_REQUEST', 'Expected a multipart/form-data body')
  }
}

/** Reads and validates the upload form: 415 for a wrong type, 413 for an oversized file, 400 VALIDATION for fields. */
export async function readUploadForm(request: Request): Promise<UploadForm> {
  assertDeclaredLength(request)
  const form = await readForm(request)
  const file = form.get('file')
  if (file instanceof File) assertUploadAllowed(file)
  return uploadSchema.parse({ file: file ?? undefined, alt: form.get('alt') ?? undefined })
}
