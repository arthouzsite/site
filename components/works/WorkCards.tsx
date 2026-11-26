'use client'

import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { PublicImage } from '@/lib/shared'
import { EnquiryDialog } from '@/components/enquiry/EnquiryDialog'
import { FairGalleryDialog } from '@/components/fairs/FairGalleryDialog'
import { ImageSlot } from '@/components/site/ImageSlot'
import { OutlineButton } from '@/components/site/OutlineButton'

export type WorkCard = {
  id: string
  title: string
  image: PublicImage | null
  /** The artist an enquiry about this work goes to. */
  artist: { slug: string; name: string }
  caption: ReactNode
}

type Props = {
  /** Heading of the full-screen viewer. */
  title: string
  works: readonly WorkCard[]
  ratio: string
  sizes: string
  /** Narrowest a column may get before the grid drops one, in px. */
  minColumn: number
  /** `fill` keeps empty columns (a short last row stays left-aligned); `fit` stretches the cards across the row. */
  columns: 'fill' | 'fit'
}

type Pictured = WorkCard & { image: PublicImage }
/** `isEnquiring` swaps the viewer for the enquiry form of the same work; `fromViewer` says where Close returns to. */
type Opened = { index: number; trigger: HTMLElement; isEnquiring: boolean; fromViewer: boolean }

const hasImage = (work: WorkCard): work is Pictured => work.image !== null

/** A grid of works. Each pictured work offers View (the full image) and Enquire (the enquiry form for that work). */
export function WorkCards({ title, works, ratio, sizes, minColumn, columns }: Props) {
  const [opened, setOpened] = useState<Opened | null>(null)
  const pictured = works.filter(hasImage)
  const current = opened ? pictured[opened.index] : undefined
  const open = (work: Pictured, trigger: HTMLElement, isEnquiring: boolean) =>
    setOpened({ index: pictured.indexOf(work), trigger, isEnquiring, fromViewer: false })

  return (
    <>
      <div className="grid gap-x-[clamp(16px,2vw,28px)] gap-y-10" style={{ gridTemplateColumns: `repeat(auto-${columns},minmax(min(100%,${minColumn}px),1fr))` }}>
        {works.map((work) => (
          <figure key={work.id} className="m-0 flex flex-col gap-3">
            <div className="relative">
              <ImageSlot image={work.image} ratio={ratio} sizes={sizes} placeholder="Artwork" />
              {hasImage(work) && (
                <div className="absolute right-0 bottom-0 left-0 flex justify-end gap-2 bg-linear-to-t from-scrim to-transparent px-3 pt-10 pb-3">
                  <OutlineButton tone="paper" aria-haspopup="dialog" aria-label={`View ${work.title}`} onClick={(event) => open(work, event.currentTarget, false)}>
                    View
                  </OutlineButton>
                  <OutlineButton tone="light" aria-haspopup="dialog" aria-label={`Enquire about ${work.title}`} onClick={(event) => open(work, event.currentTarget, true)}>
                    Enquire
                  </OutlineButton>
                </div>
              )}
            </div>
            <figcaption className="text-[14px] leading-[1.5] text-body">{work.caption}</figcaption>
          </figure>
        ))}
      </div>
      {opened && current && !opened.isEnquiring && createPortal(
        <FairGalleryDialog
          title={title}
          images={pictured.map((work) => work.image)}
          startIndex={opened.index}
          onClose={() => setOpened(null)}
          returnFocus={opened.trigger}
          action={{ label: 'Enquire', onSelect: (index) => setOpened({ ...opened, index, isEnquiring: true, fromViewer: true }) }}
        />,
        document.body,
      )}
      {opened && current && opened.isEnquiring && createPortal(
        <EnquiryDialog
          target={{ kind: 'ARTIST', slug: current.artist.slug, name: current.artist.name, work: { title: current.title, image: current.image } }}
          onClose={() => setOpened(opened.fromViewer ? { ...opened, isEnquiring: false } : null)}
          returnFocus={opened.trigger}
        />,
        document.body,
      )}
    </>
  )
}
