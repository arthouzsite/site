/* eslint-disable @next/next/no-img-element -- Uploaded media are served from the bucket at stored sizes; next/image has nothing to optimise in the CMS. */
import type { MediaRef } from './types'

export type NamedMedia = MediaRef & { name: string }

/** Rows of an ordered media list need a name to announce; the alt text when there is one. */
export const withNames = (images: MediaRef[]): NamedMedia[] => images.map((image, i) => ({ ...image, name: image.alt || `Image ${i + 1}` }))

export function MediaListItem({ image }: { image: NamedMedia }) {
  return (
    <span className="flex items-center gap-3">
      <img src={image.thumbUrl} alt="" width={36} height={36} className="h-9 w-9 shrink-0 object-cover" />
      <span className="min-w-0 truncate">{image.name}</span>
    </span>
  )
}
