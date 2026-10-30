'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { APP_ROOT_ID } from '@/lib/dom'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

function focusableIn(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
}

/** Keeps Tab / Shift+Tab cycling inside the panel. */
function trapTab(event: KeyboardEvent, panel: HTMLElement): void {
  const items = focusableIn(panel)
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return
  const active = document.activeElement
  if (event.shiftKey && (active === first || !panel.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * Modal behaviour for a portalled overlay: focuses the first control (or `initialFocus`), traps Tab,
 * closes on Escape, makes the app root inert, locks page scroll, and returns focus to the trigger
 * (`returnFocus`, else whatever was focused on open — Safari does not focus clicked buttons).
 */
export function useModalDialog(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  returnFocus: HTMLElement | null = null,
): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return undefined
    const focusOnClose = returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    const root = document.getElementById(APP_ROOT_ID)
    const html = document.documentElement
    const previousOverflow = html.style.overflow

    root?.setAttribute('inert', '')
    html.style.overflow = 'hidden'
    const autofocus = panel.querySelector<HTMLElement>('[autofocus], [data-autofocus]')
    ;(autofocus ?? focusableIn(panel)[0])?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      else if (event.key === 'Tab') trapTab(event, panel)
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      root?.removeAttribute('inert')
      html.style.overflow = previousOverflow
      if (focusOnClose?.isConnected) focusOnClose.focus()
    }
  }, [panelRef, returnFocus])
}
