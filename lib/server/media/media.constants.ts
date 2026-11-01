export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024
export const THUMB_WIDTH = 480
export const THUMB_QUALITY = 80
export const ALLOWED_IMAGE_MIMES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export type VideoMime = (typeof VIDEO_MIMES)[number]
export const ALLOWED_VIDEO_MIMES: readonly string[] = VIDEO_MIMES
export const VIDEO_EXT_BY_MIME: Readonly<Record<VideoMime, string>> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}
export const CACHE_CONTROL = 'public, max-age=31536000, immutable'
export const KEY_PREFIX = 'arthouz'
// Uploads are buffered in memory, so only this many run at once; extra requests get 429 rather than queueing.
export const MAX_CONCURRENT_UPLOADS = 2
// Multipart framing (boundaries, the alt field) adds a little to the file itself; this slack keeps a maximal video legal.
export const MULTIPART_OVERHEAD_BYTES = 1024 * 1024
// How long a presigned upload target stays valid.
export const UPLOAD_URL_TTL_SECONDS = 900
// The complete step reads this many leading bytes of a video to check its container signature.
export const VIDEO_SIGNATURE_BYTES = 64 * 1024
