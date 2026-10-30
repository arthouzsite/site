'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { isActive, type NavItem } from '@/lib/nav'
import type { NavService } from '@/lib/services'
import { navLinkClass } from './navLinkClass'

type Props = { item: NavItem; pathname: string; services: readonly NavService[] }
type OpenState = { open: boolean; pathname: string }
type Press = { wasOpen: boolean; at: number }

/** A touch tap hover-opens and focuses before its click lands; presses older than this are not part of that tap. */
const PRESS_WINDOW_MS = 800

/**
 * The Services link plus its dropdown of published services. A mouse hover or focus-within opens it; Enter follows
 * the link; ArrowDown enters the list, the arrow keys, Home and End move within it, Escape closes and returns focus
 * to the link, and a press outside closes. A separate chevron button toggles the panel on click or tap, which is
 * how touch reaches it (a touch never hover-opens, so a tap on the link just navigates). The panel is always in
 * the DOM (`hidden` while closed) so `aria-controls` never dangles; it hangs from the header's bottom edge and the
 * chevron is out of flow in the gap beside the link, so no other nav item moves. The chevron is drawn only for
 * coarse pointers, keyboard focus or while open; otherwise it is transparent, keeping the header as designed.
 */
export function ServicesNavItem({ item, pathname, services }: Props) {
  const panelId = useId()
  const wrapper = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLAnchorElement>(null)
  const panel = useRef<HTMLUListElement>(null)
  const ignoreNextFocus = useRef(false)
  const focusFirstWhenOpen = useRef(false)
  // The panel's state when a press on the chevron began: its own hover or focus must not undo the toggle.
  const press = useRef<Press | null>(null)
  const livePress = () => (press.current && performance.now() - press.current.at < PRESS_WINDOW_MS ? press.current : null)
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
    if (livePress()) return
    setOpen(true)
  }
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!wrapper.current?.contains(event.relatedTarget)) setOpen(false)
  }
  const onPointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch') setOpen(true)
  }
  const onToggleClick = () => {
    const wasOpen = livePress()?.wasOpen ?? open
    press.current = null
    setOpen(!wasOpen)
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
      onPointerEnter={onPointerEnter}
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
      <button
        type="button"
        aria-label="Show services"
        aria-expanded={open}
        aria-controls={panelId}
        onPointerDown={() => {
          press.current = { wasOpen: open, at: performance.now() }
        }}
        onClick={onToggleClick}
        className="absolute top-1/2 left-full ml-px flex h-[44px] w-4 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-ink opacity-0 before:absolute before:top-1/2 before:left-1/2 before:h-[44px] before:w-[44px] before:-translate-x-1/2 before:-translate-y-1/2 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(pointer:coarse)]:opacity-100"
      >
        <svg aria-hidden="true" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.25" className="transition-transform duration-150 in-aria-expanded:rotate-180">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>
      <ul
        ref={panel}
        id={panelId}
        hidden={!open}
        className="absolute top-full right-0 z-10 m-0 max-w-[min(360px,calc(100vw-40px))] min-w-[240px] list-none border border-line-18 bg-paper p-0"
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
                className={`flex min-h-[44px] items-center px-5 py-3 text-[12.5px] tracking-[0.16em] break-words whitespace-normal uppercase hover:bg-line-12 focus-visible:bg-line-12 ${current ? 'text-rust' : 'text-ink'}`}
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
