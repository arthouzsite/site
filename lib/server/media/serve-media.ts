import { logError } from '@/lib/server/log'
import { isServableKey } from './media-keys'
import { parseRangeHeader } from './media-range'
import { RangeNotSatisfiableError, type Storage, type StoredStream } from './storage/storage.interface'

const IMMUTABLE_CACHE = 'public, max-age=31536000, s-maxage=31536000, immutable'
const NO_STORE = 'no-store'
const STATUS_OK = 200
const STATUS_PARTIAL = 206
const STATUS_NOT_FOUND = 404
const STATUS_RANGE_NOT_SATISFIABLE = 416
const STATUS_SERVER_ERROR = 500

/** Keys are content-addressed by uuid and never rewritten, so a stored object may be cached for good. */
function objectHeaders(contentType: string, contentLength: number | undefined, etag: string | undefined): Headers {
  const headers = new Headers({
    'content-type': contentType,
    'cache-control': IMMUTABLE_CACHE,
    'accept-ranges': 'bytes',
    'x-content-type-options': 'nosniff',
  })
  if (contentLength !== undefined) headers.set('content-length', String(contentLength))
  if (etag) headers.set('etag', etag)
  return headers
}

function failure(status: number, extra: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { 'cache-control': NO_STORE, 'accept-ranges': 'bytes', ...extra } })
}

function streamResponse(stream: StoredStream): Response {
  const headers = objectHeaders(stream.contentType, stream.contentLength, stream.etag)
  const { range } = stream
  if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${range.total}`)
  return new Response(stream.body, { status: range ? STATUS_PARTIAL : STATUS_OK, headers })
}

async function headResponse(key: string, storage: Storage): Promise<Response> {
  const info = await storage.head(key)
  if (!info) return failure(STATUS_NOT_FOUND)
  return new Response(null, { status: STATUS_OK, headers: objectHeaders(info.contentType, info.bytes, info.etag) })
}

async function getResponse(key: string, rangeHeader: string | null, storage: Storage): Promise<Response> {
  try {
    const stream = await storage.getStream(key, parseRangeHeader(rangeHeader))
    return stream ? streamResponse(stream) : failure(STATUS_NOT_FOUND)
  } catch (error) {
    if (!(error instanceof RangeNotSatisfiableError)) throw error
    return failure(STATUS_RANGE_NOT_SATISFIABLE, error.total === undefined ? {} : { 'content-range': `bytes */${error.total}` })
  }
}

/**
 * Serves one stored object for GET or HEAD. The key is validated against the shapes this app stores before storage
 * is touched, so a traversal or unknown path is a 404 that never reaches the bucket.
 */
export async function serveMedia(request: Request, segments: readonly string[], storage: Storage): Promise<Response> {
  const key = segments.join('/')
  if (!isServableKey(key)) return failure(STATUS_NOT_FOUND)
  try {
    if (request.method === 'HEAD') return await headResponse(key, storage)
    return await getResponse(key, request.headers.get('range'), storage)
  } catch (error) {
    logError(`media serve failed for ${key}`, error instanceof Error ? error.stack : String(error))
    return failure(STATUS_SERVER_ERROR)
  }
}
