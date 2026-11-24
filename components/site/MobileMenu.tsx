'use client'

import Link from 'next/link'
import { Fragment, useRef } from 'react'
import { useModalDialog } from '@/hooks/useModalDialog'
import { NAV_ITEMS, PRINTS_HREF, SERVICES_HREF, isActive, type NavChild } from '@/lib/nav'
import { OutlineButton } from './OutlineButton'
import { Wordmark } from './Wordmark'

type Props = {
  pathname: string
  services: readonly NavChild[]
  prints?: readonly NavChild[]
  onClose: () => void
  returnFocus?: HTMLElement | null
}

/** Full-screen ink menu for narrow viewports, as the prototype's `menuOpen` block. */
export function MobileMenu({ pathname, services, prints = [], onClose, returnFocus }: Props) {
  const children: Record<string, readonly NavChild[]> = { [SERVICES_HREF]: services, [PRINTS_HREF]: prints }
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
        <Wordmark tone="paper" />
        <OutlineButton tone="paper" onClick={onClose}>
          Close
        </OutlineButton>
      </div>
      <nav aria-label="Menu" className="mt-8 flex flex-col">
        {NAV_ITEMS.map((item) => (
          <Fragment key={item.href}>
            <Link
              href={item.href}
              onClick={onClose}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className="border-b border-line-dark-16 py-4 font-display text-[44px] leading-none text-paper hover:text-paper"
            >
              {item.label}
            </Link>
            {(children[item.href]?.length ?? 0) > 0 && (
              <ul className="m-0 list-none p-0 pl-6">
                {children[item.href]?.map((child) => {
                  const href = `${item.href}/${encodeURIComponent(child.slug)}`
                  return (
                    <li key={child.slug}>
                      <Link
                        href={href}
                        onClick={onClose}
                        aria-current={pathname === href ? 'page' : undefined}
                        className="block border-b border-line-dark-16 py-3 font-display text-[28px] leading-none text-ondark hover:text-paper"
                      >
                        {child.title}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </Fragment>
        ))}
      </nav>
    </div>
  )
}
