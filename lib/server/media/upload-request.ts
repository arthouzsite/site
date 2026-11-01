import { z } from 'zod'
import { badRequest, payloadTooLarge, unsupportedMediaType } from '@/lib/server/http/errors'
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_VIDEO_UPLOAD_BYTES,
  MULTIPART_OVERHEAD_BYTES,
} from './media.constants'
import { isUploadKey } from './upload-keys'

const MAX_ALT_LENGTH = 500
const MAX_FILENAME_LENGTH = 255

export const altSchema = z.string('Alt text is required').trim().min(1, 'Alt text is required').max(MAX_ALT_LENGTH)

const uploadSchema = z.object({
  file: z.custom<File>((value) => value instanceof File, 'File is required'),
  alt: altSchema,
})

/** Body of `POST /api/media/uploads`: what the browser is about to send, checked before a target is issued. */
export const createUploadSchema = z.object({
  filename: z.string('Filename is required').trim().min(1, 'Filename is required').max(MAX_FILENAME_LENGTH),
  mime: z.string('Mime type is required').min(1, 'Mime type is required'),
  bytes: z.number('Size is required').int('Size must be a whole number of bytes').positive('Size must be positive'),
  alt: altSchema,
})
export type CreateUploadInput = z.infer<typeof createUploadSchema>

/** Body of `POST /api/media/uploads/complete`. */
export const completeUploadSchema = z.object({
  key: z.string('Key is required').refine(isUploadKey, 'Not a valid upload key'),
  alt: altSchema,
})
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>

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

/** Largest request body the media routes accept: the biggest video plus multipart framing. */
export const MAX_BODY_BYTES = MAX_VIDEO_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES

function assertDeclaredLength(request: Request, limit: number): void {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) throw payloadTooLarge(VIDEO_TOO_LARGE)
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
 * The request body piped through a byte counter, so a chunked request with no Content-Length cannot be buffered
 * without bound; the declared length (when present) is only an early exit.
 */
function countedBody(request: Request, limit: number): { body: ReadableStream<Uint8Array> | null; isTooLarge: () => boolean } {
  assertDeclaredLength(request, limit)
  let isTooLarge = false
  const body = request.body?.pipeThrough(limitBytes(limit, () => (isTooLarge = true))) ?? null
  return { body, isTooLarge: () => isTooLarge }
}

/** Buffers the request body, failing with 413 as soon as more than `limit` bytes have arrived. */
export async function readBoundedBody(request: Request, limit: number): Promise<Buffer> {
  const { body, isTooLarge } = countedBody(request, limit)
  try {
    return Buffer.from(await new Response(body).arrayBuffer())
  } catch {
    if (isTooLarge()) throw payloadTooLarge(VIDEO_TOO_LARGE)
    throw badRequest('BAD_REQUEST', 'Could not read the request body')
  }
}

async function readForm(request: Request): Promise<FormData> {
  const { body, isTooLarge } = countedBody(request, MAX_BODY_BYTES)
  try {
    return await new Response(body, { headers: request.headers }).formData()
  } catch {
    if (isTooLarge()) throw payloadTooLarge(VIDEO_TOO_LARGE)
    throw badRequest('BAD_REQUEST', 'Expected a multipart/form-data body')
  }
}

/** Reads and validates the upload form: 415 for a wrong type, 413 for an oversized file, 400 VALIDATION for fields. */
export async function readUploadForm(request: Request): Promise<UploadForm> {
  const form = await readForm(request)
  const file = form.get('file')
  if (file instanceof File) assertUploadAllowed(file)
  return uploadSchema.parse({ file: file ?? undefined, alt: form.get('alt') ?? undefined })
}
