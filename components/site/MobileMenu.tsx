'use client'

import Link from 'next/link'
import { Fragment, useRef } from 'react'
import { useModalDialog } from '@/hooks/useModalDialog'
import { NAV_ITEMS, SERVICES_HREF, isActive } from '@/lib/nav'
import type { NavService } from '@/lib/services'
import { OutlineButton } from './OutlineButton'

type Props = { pathname: string; services: readonly NavService[]; onClose: () => void; returnFocus?: HTMLElement | null }

/** Full-screen ink menu for narrow viewports, as the prototype's `menuOpen` block. */
export function MobileMenu({ pathname, services, onClose, returnFocus }: Props) {
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
          <Fragment key={item.href}>
            <Link
              href={item.href}
              onClick={onClose}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className="border-b border-line-dark-16 py-4 font-display text-[44px] leading-none text-paper hover:text-paper"
            >
              {item.label}
            </Link>
            {item.href === SERVICES_HREF && services.length > 0 && (
              <ul className="m-0 list-none p-0 pl-6">
                {services.map((service) => {
                  const href = `${item.href}/${encodeURIComponent(service.slug)}`
                  return (
                    <li key={service.slug}>
                      <Link
                        href={href}
                        onClick={onClose}
                        aria-current={pathname === href ? 'page' : undefined}
                        className="block border-b border-line-dark-16 py-3 font-display text-[28px] leading-none text-ondark hover:text-paper"
                      >
                        {service.title}
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
