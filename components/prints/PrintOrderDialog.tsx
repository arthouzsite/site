'use client'

import { useId, useRef } from 'react'
import Image from 'next/image'
import type { PublicImage } from '@/lib/shared'
import { LABEL_CLASS } from '@/components/enquiry/fieldStyles'
import { DialogBar } from '@/components/site/DialogBar'
import { useModalDialog } from '@/hooks/useModalDialog'
import { PrintOrderForm } from './PrintOrderForm'

const IMAGE_SIZES = '(min-width: 880px) 50vw, 100vw'

type Props = {
  slug: string
  title: string
  image: PublicImage
  onClose: () => void
  returnFocus: HTMLElement | null
}

/** Full-screen paper overlay for ordering one print: the print on one side, the order request on the other. */
export function PrintOrderDialog({ slug, title, image, onClose, returnFocus }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const headingId = useId()
  useModalDialog(panel, onClose, returnFocus)

  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={headingId} className="fixed inset-0 z-100 overflow-auto bg-paper font-ui">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,4vw,56px)] pt-6 pb-16">
        <DialogBar onClose={onClose} />
        <div className="grid items-start gap-x-[clamp(32px,6vw,88px)] gap-y-8 nav:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="relative aspect-[4/3] w-full bg-imgph nav:sticky nav:top-6 nav:aspect-[4/5] nav:max-h-[calc(100dvh-140px)]">
            <Image src={image.url} alt={image.alt} fill sizes={IMAGE_SIZES} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className={`m-0 ${LABEL_CLASS}`}>Order this print</p>
            <h2 id={headingId} className="mt-3 mb-8 font-display text-[clamp(28px,3vw,40px)] leading-[1.1] font-normal break-words">
              {title}
            </h2>
            <PrintOrderForm target={{ kind: 'PRINT', slug, title, imageUrl: image.url }} />
          </div>
        </div>
      </div>
    </div>
  )
}
