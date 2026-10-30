import type { Media } from '../generated/prisma/client'

export type ImageDto = Pick<Media, 'id' | 'url' | 'thumbUrl' | 'width' | 'height' | 'alt'>

export function toImage(media: Media | null): ImageDto | null {
  if (!media) return null
  const { id, url, thumbUrl, width, height, alt } = media
  return { id, url, thumbUrl, width, height, alt }
}
