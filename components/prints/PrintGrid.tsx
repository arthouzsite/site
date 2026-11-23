'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { PublicImage } from '@/lib/shared'
import { FairGalleryDialog } from '@/components/fairs/FairGalleryDialog'
import { ImageSlot } from '@/components/site/ImageSlot'
import { PrintOrderDialog } from './PrintOrderDialog'

const IMAGE_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'

type Props = { slug: string; title: string; images: readonly PublicImage[] }
/** `isOrdering` swaps the viewer for the order form of the same print; closing the form returns to the viewer. */
type Opened = { index: number; trigger: HTMLElement; isOrdering: boolean }

/** Every print of a category; a print opens the full-screen viewer at that image, where it can be ordered. */
export function PrintGrid({ slug, title, images }: Props) {
  const [opened, setOpened] = useState<Opened | null>(null)
  const ordered = opened?.isOrdering ? images[opened.index] : undefined

  return (
    <>
      <ul className="m-0 grid list-none gap-[clamp(16px,2vw,28px)] p-0" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))' }}>
        {images.map((image, index) => (
          <li key={`${image.url}-${index}`}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`View ${image.alt || `print ${index + 1}`}`}
              onClick={(event) => setOpened({ index, trigger: event.currentTarget, isOrdering: false })}
              className="group block w-full cursor-pointer border-0 bg-transparent p-0"
            >
              <ImageSlot image={image} ratio="4/5" sizes={IMAGE_SIZES} priority={index === 0} placeholder={title} className="transition-opacity duration-200 group-hover:opacity-85" />
            </button>
          </li>
        ))}
      </ul>
      {opened && !ordered && createPortal(
        <FairGalleryDialog
          title={title}
          images={images}
          startIndex={opened.index}
          onClose={() => setOpened(null)}
          returnFocus={opened.trigger}
          action={{ label: 'Order', onSelect: (index) => setOpened({ ...opened, index, isOrdering: true }) }}
        />,
        document.body,
      )}
      {opened && ordered && createPortal(
        <PrintOrderDialog slug={slug} title={title} image={ordered} onClose={() => setOpened({ ...opened, isOrdering: false })} returnFocus={opened.trigger} />,
        document.body,
      )}
    </>
  )
}
