'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { isActive, type NavItem } from '@/lib/nav'
import type { NavService } from '@/lib/services'
import { navLinkClass } from './navLinkClass'

type Props = { item: NavItem; pathname: string; services: readonly NavService[] }
type OpenState = { open: boolean; pathname: string }

/**
 * The Services link plus its dropdown of published services. Hover or focus-within opens it; Enter follows the
 * link; ArrowDown enters the list, the arrow keys, Home and End move within it, Escape closes and returns focus
 * to the link, and a press outside closes. The panel is always in the DOM (`hidden` while closed) so
 * `aria-controls` never dangles, and it hangs from the header's bottom edge so no other nav item moves.
 */
export function ServicesNavItem({ item, pathname, services }: Props) {
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLAnchorElement>(null)
  const panel = useRef<HTMLUListElement>(null)
  const ignoreNextFocus = useRef(false)
  const focusFirstWhenOpen = useRef(false)
  // Keyed by pathname so the panel closes on navigation without an effect.
  const [state, setState] = useState<OpenState>({ open: false, pathname })
  const open = state.open && state.pathname === pathname
  const setOpen = (value: boolean) => setState({ open: value, pathname })
  const choices = () => Array.from(panel.current?.querySelectorAll('a') ?? [])

  useEffect(() => {
    if (open && focusFirstWhenOpen.current) {
      focusFirstWhenOpen.current = false
      choices()[0]?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onPress = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapper.current?.contains(event.target)) setState({ open: false, pathname })
    }
    document.addEventListener('pointerdown', onPress)
    return () => document.removeEventListener('pointerdown', onPress)
  }, [open, pathname])

  const onFocus = () => {
    if (ignoreNextFocus.current) {
      ignoreNextFocus.current = false
      return
    }
    setOpen(true)
  }
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!wrapper.current?.contains(event.relatedTarget)) setOpen(false)
  }
  // A pointer leaving never takes the panel from under a keyboard user who is inside it.
  const onMouseLeave = () => {
    if (!wrapper.current?.contains(document.activeElement)) setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = choices()
    const index = items.findIndex((link) => link === document.activeElement)
    const onTrigger = document.activeElement === trigger.current
    const move = (target: HTMLElement | undefined) => {
      event.preventDefault()
      target?.focus()
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      ignoreNextFocus.current = !onTrigger
      setOpen(false)
      trigger.current?.focus()
    } else if (event.key === 'ArrowDown' && onTrigger && !open) {
      event.preventDefault()
      focusFirstWhenOpen.current = true
      setOpen(true)
    } else if (event.key === 'ArrowDown') {
      move(onTrigger ? items[0] : items[Math.min(index + 1, items.length - 1)])
    } else if (event.key === 'ArrowUp' && index === 0) {
      move(trigger.current ?? undefined)
    } else if (event.key === 'ArrowUp' && index > 0) {
      move(items[index - 1])
    } else if (event.key === 'Home' && index >= 0) {
      move(items[0])
    } else if (event.key === 'End' && index >= 0) {
      move(items[items.length - 1])
    }
  }

  return (
    <div
      ref={wrapper}
      className="relative flex items-center self-stretch"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={onMouseLeave}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    >
      <Link
        ref={trigger}
        href={item.href}
        aria-current={isActive(pathname, item.href) ? 'page' : undefined}
        aria-expanded={open}
        aria-controls={panelId}
        className={navLinkClass(isActive(pathname, item.href))}
      >
        {item.label}
      </Link>
      <ul
        ref={panel}
        id={panelId}
        hidden={!open}
        className="absolute top-full left-0 z-10 m-0 min-w-[240px] list-none border border-line-18 bg-paper p-0"
      >
        {services.map((service) => {
          const href = `${item.href}/${encodeURIComponent(service.slug)}`
          const current = pathname === href
          return (
            <li key={service.slug}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={current ? 'page' : undefined}
                className={`flex min-h-[44px] items-center px-5 text-[12.5px] tracking-[0.16em] whitespace-nowrap uppercase hover:bg-line-12 focus-visible:bg-line-12 ${current ? 'text-rust' : 'text-ink'}`}
              >
                {service.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
