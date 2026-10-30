export type Media = {
  id: string
  key: string
  url: string
  thumbUrl: string
  width: number
  height: number
  mime: string
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

/** Maps by status as well as code: a proxy can answer 413/415 without a JSON envelope. */
export function uploadErrorMessage({ status, code, fields, message }: UploadErrorInfo): string {
  if (status === 413 || code === 'PAYLOAD_TOO_LARGE') return 'This file is larger than 25 MB.'
  if (status === 415 || code === 'UNSUPPORTED_MEDIA_TYPE') return 'Only JPEG, PNG, WebP and AVIF images are accepted.'
  if (code === 'INVALID_IMAGE') return 'This file is not a valid image.'
  if (code === 'VALIDATION') {
    if (fields?.alt) return 'Alt text is required.'
    const first = fields ? Object.values(fields)[0] : undefined
    return first ?? message
  }
  return message
}
