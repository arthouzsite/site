'use client'

import { useId, useRef } from 'react'
import Image from 'next/image'
import type { PublicImage } from '@/lib/shared'
import { OutlineButton } from '@/components/site/OutlineButton'
import { useGalleryIndex } from '@/hooks/useGalleryIndex'
import { useModalDialog } from '@/hooks/useModalDialog'
import { FairGalleryThumbs } from './FairGalleryThumbs'

const STAGE_SIZES = '(min-width: 1024px) 80vw, 100vw'

type Props = {
  title: string
  images: readonly PublicImage[]
  onClose: () => void
  returnFocus: HTMLElement | null
  /** The image shown first; the gallery of a fair starts at its first one. */
  startIndex?: number
}

/** Full-screen paper overlay like the enquiry dialog: title and Close on top, one contained image at a time below. */
export function FairGalleryDialog({ title, images, onClose, returnFocus, startIndex = 0 }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const headingId = useId()
  useModalDialog(panel, onClose, returnFocus)
  const { index, setIndex, next, prev } = useGalleryIndex(images.length, startIndex)
  const current = images[index]
  const isSingle = images.length < 2

  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={headingId} className="fixed inset-0 z-100 flex flex-col bg-paper font-ui">
      <div className="flex items-start justify-between gap-6 px-[clamp(20px,4vw,56px)] pt-6 pb-4">
        <h2 id={headingId} className="m-0 min-w-0 font-display text-[clamp(26px,3vw,40px)] leading-[1.1] font-normal break-words">
          {title}
        </h2>
        <OutlineButton tone="ink" onClick={onClose}>
          Close
        </OutlineButton>
      </div>
      <div className="relative mx-[clamp(20px,4vw,56px)] min-h-0 flex-1 bg-imgph">
        {current && <Image key={current.url} src={current.url} alt={current.alt} fill sizes={STAGE_SIZES} className="object-contain" />}
      </div>
      {!isSingle && (
        <div className="px-[clamp(20px,4vw,56px)] pt-4 pb-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <OutlineButton tone="ink" onClick={prev}>
              Previous
            </OutlineButton>
            <span className="text-[12px] tracking-[0.16em] text-muted tabular-nums" aria-live="polite">
              {index + 1} / {images.length}
            </span>
            <OutlineButton tone="ink" onClick={next}>
              Next
            </OutlineButton>
          </div>
          <FairGalleryThumbs images={images} activeIndex={index} onSelect={setIndex} />
        </div>
      )}
    </div>
  )
}
