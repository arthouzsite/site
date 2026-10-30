'use client'

import { usePathname } from 'next/navigation'
import { useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { HeaderNav } from './HeaderNav'
import { MobileMenu } from './MobileMenu'
import { OutlineButton } from './OutlineButton'
import { SearchButton } from './SearchButton'
import { SearchOverlay } from './SearchOverlay'

type Overlay = 'none' | 'menu' | 'search'
type OverlayState = { kind: Overlay; pathname: string; trigger: HTMLElement | null }

/** Owns the open/closed state of the mobile menu and the search overlay; both close on navigation. */
export function HeaderClient() {
  const pathname = usePathname()
  // `trigger` is the control that opened the overlay; focus returns to it on close.
  const [overlay, setOverlay] = useState<OverlayState>({ kind: 'none', pathname, trigger: null })
  const open = overlay.pathname === pathname ? overlay.kind : 'none'
  const openFrom = (kind: Overlay) => (event: MouseEvent<HTMLElement>) => {
    setOverlay({ kind, pathname, trigger: event.currentTarget })
  }
  const close = () => setOverlay((current) => ({ ...current, kind: 'none' }))

  return (
    <>
      <HeaderNav pathname={pathname} onSearch={openFrom('search')} />
      <div className="flex items-center gap-2 nav:hidden">
        <SearchButton variant="mobile" onClick={openFrom('search')} />
        <OutlineButton tone="ink" onClick={openFrom('menu')} aria-haspopup="dialog" aria-expanded={open === 'menu'}>
          Menu
        </OutlineButton>
      </div>
      {/* Portalled: the header's backdrop-filter would otherwise contain these fixed overlays. */}
      {open === 'menu' && createPortal(<MobileMenu pathname={pathname} onClose={close} returnFocus={overlay.trigger} />, document.body)}
      {open === 'search' && createPortal(<SearchOverlay onClose={close} returnFocus={overlay.trigger} />, document.body)}
    </>
  )
}
