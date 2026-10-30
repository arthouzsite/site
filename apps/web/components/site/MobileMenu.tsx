'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { useModalDialog } from '@/hooks/useModalDialog'
import { NAV_ITEMS, isActive } from '@/lib/nav'
import { OutlineButton } from './OutlineButton'

type Props = { pathname: string; onClose: () => void; returnFocus?: HTMLElement | null }

/** Full-screen ink menu for narrow viewports, as the prototype's `menuOpen` block. */
export function MobileMenu({ pathname, onClose, returnFocus }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  useModalDialog(panel, onClose, returnFocus)

  return (
    <div
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-100 flex flex-col overflow-auto bg-ink font-ui px-[clamp(20px,4vw,56px)] pb-8 text-paper"
    >
      <div className="flex h-[76px] items-center justify-between">
        <span className="text-[16px] font-medium tracking-[0.34em]">ART HOUZ</span>
        <OutlineButton tone="paper" onClick={onClose}>
          Close
        </OutlineButton>
      </div>
      <nav aria-label="Menu" className="mt-8 flex flex-col">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className="border-b border-line-dark-16 py-4 font-display text-[44px] leading-none text-paper hover:text-paper"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
