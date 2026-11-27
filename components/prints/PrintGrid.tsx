'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { PublicImage } from '@/lib/shared'
import { FairGalleryDialog } from '@/components/fairs/FairGalleryDialog'
import { ImageSlot } from '@/components/site/ImageSlot'
import { OutlineButton } from '@/components/site/OutlineButton'
import { PrintOrderDialog } from './PrintOrderDialog'

const IMAGE_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'

const nameOf = (image: PublicImage, index: number): string => image.alt || `print ${index + 1}`

type Props = { slug: string; title: string; images: readonly PublicImage[] }
/** `isOrdering` swaps the viewer for the order form of the same print; `fromViewer` says where Close returns to. */
type Opened = { index: number; trigger: HTMLElement; isOrdering: boolean; fromViewer: boolean }

/** Every print of a category. Each print offers View (the full image) and Order (the order form for that print). */
export function PrintGrid({ slug, title, images }: Props) {
  const [opened, setOpened] = useState<Opened | null>(null)
  const ordered = opened?.isOrdering ? images[opened.index] : undefined
  const open = (index: number, trigger: HTMLElement, isOrdering: boolean) => setOpened({ index, trigger, isOrdering, fromViewer: false })

  return (
    <>
      <ul className="m-0 grid list-none gap-[clamp(16px,2vw,28px)] p-0" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))' }}>
        {images.map((image, index) => (
          <li key={`${image.url}-${index}`}>
            <div className="relative">
              <ImageSlot image={image} ratio="4/5" sizes={IMAGE_SIZES} priority={index === 0} placeholder={title} />
              <div className="absolute right-0 bottom-0 left-0 flex justify-end gap-2 bg-linear-to-t from-scrim to-transparent px-3 pt-10 pb-3">
                <OutlineButton tone="paper" aria-haspopup="dialog" aria-label={`View ${nameOf(image, index)}`} onClick={(event) => open(index, event.currentTarget, false)}>
                  View
                </OutlineButton>
                <OutlineButton tone="light" aria-haspopup="dialog" aria-label={`Order ${nameOf(image, index)}`} onClick={(event) => open(index, event.currentTarget, true)}>
                  Order
                </OutlineButton>
              </div>
            </div>
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
          action={{ label: 'Order', onSelect: (index) => setOpened({ ...opened, index, isOrdering: true, fromViewer: true }) }}
        />,
        document.body,
      )}
      {opened && ordered && createPortal(
        <PrintOrderDialog slug={slug} title={title} image={ordered} onClose={() => setOpened(opened.fromViewer ? { ...opened, isOrdering: false } : null)} returnFocus={opened.trigger} />,
        document.body,
      )}
    </>
  )
}
