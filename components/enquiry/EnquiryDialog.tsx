'use client'

import { useRef } from 'react'
import { OutlineButton } from '@/components/site/OutlineButton'
import { useModalDialog } from '@/hooks/useModalDialog'
import { EnquiryForm } from './EnquiryForm'
import type { EnquiryTarget } from './useEnquiryForm'

type Props = { target: EnquiryTarget; onClose: () => void; returnFocus: HTMLElement | null }

const subjectOf = (target: EnquiryTarget): string => ('name' in target ? target.name : target.title)

/** Full-screen paper overlay, like the search and menu overlays: Close at the top, the form below. */
export function EnquiryDialog({ target, onClose, returnFocus }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  useModalDialog(panel, onClose, returnFocus)
  return (
    <div ref={panel} role="dialog" aria-modal="true" aria-label={`Enquire: ${subjectOf(target)}`} className="fixed inset-0 z-100 overflow-auto bg-paper font-ui">
      <div className="mx-auto max-w-[640px] px-[clamp(20px,4vw,56px)] pt-6 pb-16">
        <div className="mb-8 flex justify-end">
          <OutlineButton tone="ink" onClick={onClose}>
            Close
          </OutlineButton>
        </div>
        <EnquiryForm target={target} />
      </div>
    </div>
  )
}
