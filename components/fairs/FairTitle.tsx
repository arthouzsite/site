'use client'

import { useState, type MouseEvent } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import type { PublicFair } from '@/lib/shared'
import { FairGalleryDialog } from './FairGalleryDialog'

type Props = Pick<PublicFair, 'slug' | 'title' | 'gallery'>

/** The title stays a real link to the fair's page (no-JS, crawlers); with JS the click opens the gallery overlay instead. */
export function FairTitle({ slug, title, gallery }: Props) {
  const [trigger, setTrigger] = useState<HTMLElement | null>(null)
  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    // Let modified clicks (new tab, etc.) follow the link.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setTrigger(event.currentTarget)
  }
  return (
    <>
      <Link href={`/fairs/${encodeURIComponent(slug)}`} aria-haspopup="dialog" onClick={open} className="text-ink hover:text-rust">
        {title}
      </Link>
      {trigger && createPortal(<FairGalleryDialog title={title} images={gallery} onClose={() => setTrigger(null)} returnFocus={trigger} />, document.body)}
    </>
  )
}
