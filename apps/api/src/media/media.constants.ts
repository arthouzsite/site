export const MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024
export const THUMB_WIDTH = 480
export const THUMB_QUALITY = 80
export const ALLOWED_IMAGE_MIMES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const ALLOWED_VIDEO_MIMES: readonly string[] = ['video/mp4', 'video/webm', 'video/quicktime']
export const VIDEO_EXT_BY_MIME: Readonly<Record<string, string>> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}
export const CACHE_CONTROL = 'public, max-age=31536000, immutable'
export const KEY_PREFIX = 'arthouz'
