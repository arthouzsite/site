import type { PublicImage } from '@arthouz/shared'
import Image from 'next/image'

type Props = {
  image: PublicImage | null
  /** CSS aspect-ratio, e.g. "4/3". Ignored when `fill` is set. */
  ratio?: string
  /** Fill the positioned parent instead of sizing by ratio (the prototype's absolutely placed <image-slot>). */
  fill?: boolean
  sizes: string
  priority?: boolean
  /** Describes the slot for screen readers when no image is set. */
  placeholder: string
  className?: string
}

/** Image box on the placeholder colour; renders the image as object-cover when one exists. */
export function ImageSlot({ image, ratio, fill = false, sizes, priority = false, placeholder, className = '' }: Props) {
  const sizing = fill ? 'absolute inset-0' : 'relative'
  return (
    <div
      className={`${sizing} overflow-hidden bg-imgph ${className}`}
      style={!fill && ratio ? { aspectRatio: ratio } : undefined}
      role={image ? undefined : 'img'}
      aria-label={image ? undefined : placeholder}
    >
      {image && (
        <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
      )}
    </div>
  )
}
