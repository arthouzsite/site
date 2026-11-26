import type { PublicImage } from '@/lib/shared'
import Image from 'next/image'

type Props = {
  image: PublicImage | null
  sizes: string
  priority?: boolean
  /** Describes the box for screen readers when no image is set. */
  placeholder: string
  /** Shape of the empty box when there is no image, e.g. "4/5". */
  fallbackRatio: string
  className?: string
}

/**
 * The whole image, never cropped: the box takes the picture's own shape, so what was uploaded in the CMS is what
 * the page shows. A height limit in `className` letterboxes it on the placeholder colour instead of cutting it.
 */
export function FullImage({ image, sizes, priority = false, placeholder, fallbackRatio, className = '' }: Props) {
  const ratio = image ? `${image.width}/${image.height}` : fallbackRatio
  return (
    <div
      className={`relative w-full bg-imgph ${className}`}
      style={{ aspectRatio: ratio }}
      role={image ? undefined : 'img'}
      aria-label={image ? undefined : placeholder}
    >
      {image && <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} className="object-contain" />}
    </div>
  )
}
