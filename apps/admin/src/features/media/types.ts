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

const UPLOAD_ERRORS: Record<string, string> = {
  VALIDATION: 'Alt text is required.',
  INVALID_IMAGE: 'This file could not be read as an image.',
  PAYLOAD_TOO_LARGE: 'This file is larger than 25 MB.',
  UNSUPPORTED_MEDIA_TYPE: 'Use a JPEG, PNG, WebP or AVIF image.',
}

export function uploadErrorMessage(code: string | undefined, fallback: string): string {
  return (code && UPLOAD_ERRORS[code]) || fallback
}
