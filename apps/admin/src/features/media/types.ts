export type MediaKind = 'IMAGE' | 'VIDEO'
/** Values of the `kind` query param on `GET /media`; '' means all types. */
export type MediaKindFilter = 'image' | 'video' | ''

export const IMAGE_MIMES = 'image/jpeg,image/png,image/webp,image/avif'
export const VIDEO_MIMES = 'video/mp4,video/webm,video/quicktime'
export const MEDIA_ACCEPT = `${IMAGE_MIMES},${VIDEO_MIMES}`
const MAX_IMAGE_LABEL = '25 MB'
const MAX_VIDEO_LABEL = '200 MB'
export const IMAGE_HINT = `JPEG, PNG, WebP or AVIF up to ${MAX_IMAGE_LABEL}`
export const MEDIA_HINT = `${IMAGE_HINT}, or MP4, WebM or MOV up to ${MAX_VIDEO_LABEL}`

export function parseKindFilter(value: string | null): MediaKindFilter {
  return value === 'image' || value === 'video' ? value : ''
}

export type Media = {
  id: string
  key: string
  url: string
  thumbUrl: string
  width: number
  height: number
  mime: string
  kind: MediaKind
  bytes: number
  alt: string
  caption: string | null
  uploadedById: string
  createdAt: string
  updatedAt: string
}

export type MediaUsage = { type: string; id: string; title: string }
export type MediaDetail = Media & { usedBy: MediaUsage[] }

export type MediaRef = Pick<Media, 'id' | 'url' | 'thumbUrl' | 'width' | 'height' | 'alt'>

export function toMediaRef(m: Media): MediaRef {
  return { id: m.id, url: m.url, thumbUrl: m.thumbUrl, width: m.width, height: m.height, alt: m.alt }
}

export function fileName(m: Pick<Media, 'key'>): string {
  return m.key.split('/').pop() ?? m.key
}

export type UploadErrorInfo = { status: number; code?: string; fields?: Record<string, string>; message: string }

function tooLargeMessage(file?: Pick<File, 'type'>): string {
  if (file?.type.startsWith('video/')) return `This video is larger than ${MAX_VIDEO_LABEL}.`
  if (file?.type.startsWith('image/')) return `This image is larger than ${MAX_IMAGE_LABEL}.`
  return `This file is larger than the allowed size (${MAX_IMAGE_LABEL} images, ${MAX_VIDEO_LABEL} video).`
}

/** Maps by status as well as code: a proxy can answer 413/415 without a JSON envelope. */
export function uploadErrorMessage({ status, code, fields, message }: UploadErrorInfo, file?: Pick<File, 'type'>): string {
  if (status === 413 || code === 'PAYLOAD_TOO_LARGE') return tooLargeMessage(file)
  if (status === 415 || code === 'UNSUPPORTED_MEDIA_TYPE') return 'Only JPEG, PNG, WebP, AVIF, MP4, WebM or MOV files are accepted.'
  if (code === 'INVALID_IMAGE') return 'This file is not a valid image.'
  if (code === 'INVALID_VIDEO') return 'This file is not a valid video.'
  if (status === 429 || code === 'TOO_MANY_UPLOADS') return 'Too many uploads at once. Wait a moment and try again.'
  if (code === 'VALIDATION') {
    if (fields?.alt) return 'Alt text is required.'
    const first = fields ? Object.values(fields)[0] : undefined
    return first ?? message
  }
  return message
}
