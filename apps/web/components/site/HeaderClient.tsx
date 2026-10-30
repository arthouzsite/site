'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { HeaderNav } from './HeaderNav'
import { MobileMenu } from './MobileMenu'
import { OutlineButton } from './OutlineButton'
import { SearchButton } from './SearchButton'
import { SearchOverlay } from './SearchOverlay'

type Overlay = 'none' | 'menu' | 'search'

/** Owns the open/closed state of the mobile menu and the search overlay; both close on navigation. */
export function HeaderClient() {
  const pathname = usePathname()
  const [overlay, setOverlay] = useState<{ kind: Overlay; pathname: string }>({ kind: 'none', pathname })
  const open = overlay.pathname === pathname ? overlay.kind : 'none'
  const show = (kind: Overlay) => setOverlay({ kind, pathname })
  const close = () => show('none')

  return (
    <>
      <HeaderNav pathname={pathname} onSearch={() => show('search')} />
      <div className="flex items-center gap-2 nav:hidden">
        <SearchButton variant="mobile" onClick={() => show('search')} />
        <OutlineButton tone="ink" onClick={() => show('menu')} aria-haspopup="dialog" aria-expanded={open === 'menu'}>
          Menu
        </OutlineButton>
      </div>
      {/* Portalled: the header's backdrop-filter would otherwise contain these fixed overlays. */}
      {open === 'menu' && createPortal(<MobileMenu pathname={pathname} onClose={close} />, document.body)}
      {open === 'search' && createPortal(<SearchOverlay onClose={close} />, document.body)}
    </>
  )
}
