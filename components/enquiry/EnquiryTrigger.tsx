'use client'

import { useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { PRIMARY_BUTTON_CLASS, PRIMARY_BUTTON_ELEMENT_CLASS } from '@/components/site/PrimaryButton'
import { EnquiryDialog } from './EnquiryDialog'
import type { EnquiryTarget } from './useEnquiryForm'

type Props = { label: string; target: EnquiryTarget }

/** The page's enquire call-to-action: looks exactly like the primary link button and opens the enquiry dialog. */
export function EnquiryTrigger({ label, target }: Props) {
  // `trigger` is the button that opened the dialog; focus returns to it on close.
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)
  const open = (event: MouseEvent<HTMLElement>) => setTrigger(event.currentTarget)
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={open} className={`${PRIMARY_BUTTON_CLASS} ${PRIMARY_BUTTON_ELEMENT_CLASS}`}>
        {label}
      </button>
      {/* Portalled like the header overlays, so the page's own stacking and inert root do not contain it. */}
      {trigger && createPortal(<EnquiryDialog target={target} onClose={() => setTrigger(null)} returnFocus={trigger} />, document.body)}
    </>
  )
}
