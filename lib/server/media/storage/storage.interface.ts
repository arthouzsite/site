export type UploadTarget = {
  url: string
  method: 'PUT'
  headers: Record<string, string>
  /** ISO timestamp after which the target no longer accepts the upload. */
  expiresAt: string
}

export type StoredObjectInfo = { bytes: number; contentType: string }

export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>
  delete(key: string): Promise<void>
  /** Public URL of an object that is already stored under `key`. */
  urlFor(key: string): string
  /** Where the browser sends the bytes for `key`; `bytes` is the declared size. */
  createUploadTarget(key: string, contentType: string, bytes: number): Promise<UploadTarget>
  /** Size and content type of a stored object, or null when nothing is stored under `key`. */
  head(key: string): Promise<StoredObjectInfo | null>
  get(key: string): Promise<Buffer>
  /** Bytes `start` through `endInclusive` of an object (fewer when it is shorter). */
  getRange(key: string, start: number, endInclusive: number): Promise<Buffer>
}
