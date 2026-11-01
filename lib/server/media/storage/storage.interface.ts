import type { RangeRequest, ResolvedRange } from '../media-range'

export type UploadTarget = {
  url: string
  method: 'PUT'
  headers: Record<string, string>
  /** ISO timestamp after which the target no longer accepts the upload. */
  expiresAt: string
}

export type StoredObjectInfo = { bytes: number; contentType: string; etag?: string }

/** Bytes of an object being read: the whole body, or the part the caller asked for. */
export type StoredStream = {
  body: ReadableStream<Uint8Array>
  contentType: string
  /** Length of `body` in bytes, when known. */
  contentLength?: number
  etag?: string
  /** Present when only part of the object is streamed: inclusive positions and the object's full size. */
  range?: ResolvedRange
}

/** The requested range starts past the end of the object; `total` is the object's size when known. */
export class RangeNotSatisfiableError extends Error {
  constructor(readonly total?: number) {
    super('Requested range not satisfiable')
    this.name = 'RangeNotSatisfiableError'
  }
}

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>
  delete(key: string): Promise<void>
  /** Same-origin (or CDN) URL the app serves the object at; the bucket itself is private. */
  urlFor(key: string): string
  /** URL the browser loads the object from: a presigned bucket URL (stable within the hour) for R2, `urlFor(key)` for the memory driver. */
  publicUrlFor(key: string): Promise<string>
  /** Where the browser sends the bytes for `key`; `bytes` is the declared size. */
  createUploadTarget(key: string, contentType: string, bytes: number): Promise<UploadTarget>
  /** Size and content type of a stored object, or null when nothing is stored under `key`. */
  head(key: string): Promise<StoredObjectInfo | null>
  get(key: string): Promise<Buffer>
  /** Bytes `start` through `endInclusive` of an object (fewer when it is shorter). */
  getRange(key: string, start: number, endInclusive: number): Promise<Buffer>
  /** The object as a stream (optionally one byte range of it); null when nothing is stored under `key`. Throws `RangeNotSatisfiableError` for a range past the end. */
  getStream(key: string, range?: RangeRequest): Promise<StoredStream | null>
}
