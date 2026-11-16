import Image from 'next/image'
import type { PublicImage } from '@/lib/shared'

const THUMB_SIZE_PX = 56

type Props = { images: readonly PublicImage[]; activeIndex: number; onSelect: (index: number) => void }

/** Scrolls inside its own strip, so a long gallery never widens the page. */
export function FairGalleryThumbs({ images, activeIndex, onSelect }: Props) {
  return (
    <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1">
      {images.map((image, index) => (
        <li key={`${image.url}-${index}`} className="shrink-0">
          <button
            type="button"
            aria-label={`Show image ${index + 1}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => onSelect(index)}
            style={{ width: THUMB_SIZE_PX, height: THUMB_SIZE_PX }}
            className={`relative block cursor-pointer overflow-hidden border border-solid bg-imgph p-0 ${index === activeIndex ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100'}`}
          >
            <Image src={image.thumbUrl} alt="" fill sizes={`${THUMB_SIZE_PX}px`} className="object-cover" />
          </button>
        </li>
      ))}
    </ul>
  )
}
