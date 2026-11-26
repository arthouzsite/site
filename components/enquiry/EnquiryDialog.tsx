'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { DialogBar } from '@/components/site/DialogBar'
import { useModalDialog } from '@/hooks/useModalDialog'
import { EnquiryForm } from './EnquiryForm'
import { LABEL_CLASS } from './fieldStyles'
import type { EnquiryTarget } from './useEnquiryForm'

type Props = { target: EnquiryTarget; onClose: () => void; returnFocus: HTMLElement | null }

const IMAGE_SIZES = '(min-width: 880px) 50vw, 100vw'

const subjectOf = (target: EnquiryTarget): string => ('name' in target ? target.name : target.title)
const workOf = (target: EnquiryTarget) => (target.kind === 'ARTIST' ? target.work : undefined)

/**
 * Full-screen paper overlay, like the search and menu overlays: the logo and Close at the top, the form below.
 * An enquiry about one work shows that work beside the form.
 */
export function EnquiryDialog({ target, onClose, returnFocus }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  useModalDialog(panel, onClose, returnFocus)
  const work = workOf(target)
  const label = `Enquire: ${work ? `${work.title}, ${subjectOf(target)}` : subjectOf(target)}`

  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-100 overflow-auto bg-paper font-ui">
      <div className={`mx-auto px-[clamp(20px,4vw,56px)] pt-6 pb-16 ${work ? 'max-w-[1180px]' : 'max-w-[640px]'}`}>
        <DialogBar onClose={onClose} />
        {work ? (
          <div className="grid items-start gap-x-[clamp(32px,6vw,88px)] gap-y-8 nav:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="relative aspect-[4/3] w-full bg-imgph nav:sticky nav:top-6 nav:aspect-[4/5] nav:max-h-[calc(100dvh-140px)]">
              <Image src={work.image.url} alt={work.image.alt} fill sizes={IMAGE_SIZES} className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className={`m-0 ${LABEL_CLASS}`}>Enquire about this work</p>
              <h2 className="mt-3 mb-8 font-display text-[clamp(28px,3vw,40px)] leading-[1.1] font-normal break-words">{work.title}</h2>
              <EnquiryForm target={target} />
            </div>
          </div>
        ) : (
          <EnquiryForm target={target} />
        )}
      </div>
    </div>
  )
}
