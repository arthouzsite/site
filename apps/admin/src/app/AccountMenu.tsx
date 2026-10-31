import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { ROLE_LABEL } from '../features/auth/roleLabel'
import type { SessionUser } from '../features/auth/useSession'
import { initials } from '../lib/format'

type Props = { user: SessionUser; onLogout: () => void }

const MENU_ITEM = '[role="menuitem"]'
const ITEM_CLASS =
  'flex min-h-11 w-full items-center px-4 text-left text-13 text-ink hover:bg-hover-ink focus-visible:bg-hover-ink focus-visible:shadow-none'

const wrap = (index: number, length: number) => (index + length) % length

/**
 * The topbar avatar: a menu button showing who is signed in, with the account actions behind it.
 * Signing out is a deliberate choice from the list, never the click on the avatar itself.
 */
export function AccountMenu({ user, onLogout }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [focusOn, setFocusOn] = useState<'first' | 'last' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const labelId = useId()
  const isAdmin = user.role === 'ADMIN'

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>(MENU_ITEM) ?? [])

  const close = useCallback((restoreFocus: boolean) => {
    setIsOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }, [])

  const openAt = (position: 'first' | 'last') => {
    setIsOpen(true)
    setFocusOn(position)
  }

  // The list exists only after the open commit; move focus into it then.
  useLayoutEffect(() => {
    if (!isOpen || !focusOn) return
    const all = items()
    all[focusOn === 'first' ? 0 : all.length - 1]?.focus()
    setFocusOn(null)
  }, [isOpen, focusOn])

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen, close])

  // Focus leaving the avatar and its list (Tab, or a click elsewhere) dismisses the menu.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (isOpen && !root.current?.contains(e.relatedTarget as Node | null)) close(false)
  }

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault()
      close(true)
    } else if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openAt('first')
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      openAt('last')
    }
  }

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = items()
    const current = all.indexOf(document.activeElement as HTMLElement)
    const focusAt = (index: number) => all[wrap(index, all.length)]?.focus()
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusAt(current + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusAt(current - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusAt(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusAt(all.length - 1)
    }
  }

  return (
    <div ref={root} className="relative" onBlur={onBlur}>
      <button
        ref={trigger}
        type="button"
        aria-label={`${user.name}, account menu`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => (isOpen ? close(false) : setIsOpen(true))}
        onKeyDown={onTriggerKeyDown}
        className="grid h-11 w-11 place-items-center rounded-full border-0 bg-transparent"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-amber text-12 font-semibold text-ink">
          {initials(user.name, user.email[0]?.toUpperCase() ?? '?')}
        </span>
      </button>
      {isOpen && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-labelledby={labelId}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-30 mt-1 w-64 rounded-xs border border-line bg-surface-2 py-1.5 shadow-toast"
        >
          <div className="border-b border-line px-4 pb-3 pt-2">
            <div id={labelId} className="text-14 font-medium text-ink">{user.name}</div>
            <div className="truncate text-12 text-muted">{user.email}</div>
            <div className="mt-1.5 text-11 uppercase tracking-eyebrow text-faint">{ROLE_LABEL[user.role]}</div>
          </div>
          <div className="pt-1.5">
            {isAdmin && (
              <Link to="/users" role="menuitem" tabIndex={-1} onClick={() => close(false)} className={ITEM_CLASS}>
                Users
              </Link>
            )}
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => {
                close(false)
                onLogout()
              }}
              className={ITEM_CLASS}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
