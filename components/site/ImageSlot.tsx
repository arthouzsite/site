import type { PublicImage } from '@/lib/shared'
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

function hasUsableDimensions(image: PublicImage): boolean {
  return Number.isFinite(image.width) && Number.isFinite(image.height) && image.width > 0 && image.height > 0
}

/**
 * Image box on the placeholder colour. The picture covers the box like the prototype's image-slot: sized in
 * container units from the stored aspect (fractional, centred), so the crop matches pixel for pixel.
 * `object-cover` stays on so a file whose real shape differs from the stored dimensions still covers;
 * without usable dimensions it falls back to next/image `fill` + `object-cover`.
 */
export function ImageSlot({ image, ratio, fill = false, sizes, priority = false, placeholder, className = '' }: Props) {
  const sizing = fill ? 'absolute inset-0' : 'relative'
  return (
    <div
      className={`${sizing} overflow-hidden bg-imgph ${className}`}
      style={{ ...(!fill && ratio ? { aspectRatio: ratio } : {}), containerType: 'size' }}
      role={image ? undefined : 'img'}
      aria-label={image ? undefined : placeholder}
    >
      {image && <SlotImage image={image} sizes={sizes} priority={priority} />}
    </div>
  )
}

function SlotImage({ image, sizes, priority }: { image: PublicImage; sizes: string; priority: boolean }) {
  if (!hasUsableDimensions(image)) {
    return <Image src={image.url} alt={image.alt} fill sizes={sizes} priority={priority} className="object-cover" />
  }
  const aspect = image.width / image.height
  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      priority={priority}
      className="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
      style={{ width: `max(100cqw, calc(100cqh * ${aspect}))`, height: `max(100cqh, calc(100cqw / ${aspect}))` }}
    />
  )
}
