import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Icon } from '../components/ui/Icon'
import type { SessionUser } from '../features/auth/useSession'
import { useBreadcrumbLabel } from './breadcrumb'
import { AccountMenu } from './AccountMenu'
import { CommandPalette } from './CommandPalette'

const SEGMENT_LABEL: Record<string, string> = { new: 'New', about: 'About page', settings: 'Home & settings' }
/** Second path segment of /section/:id or /section/new: the record, not a section. */
const RECORD_SEGMENT = 1

type Crumb = { label: string; to?: string }

const capitalise = (s: string) => SEGMENT_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1)

function buildCrumbs(pathname: string, recordLabel: string | null): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  return segments.map((segment, i) => {
    const isLast = i === segments.length - 1
    const label = i === RECORD_SEGMENT ? (recordLabel ?? (segment === 'new' ? 'New' : 'Loading…')) : capitalise(segment)
    return isLast ? { label } : { label, to: `/${segments.slice(0, i + 1).join('/')}` }
  })
}

type Props = { user: SessionUser; breadcrumb?: ReactNode; onLogout: () => void }

export function Topbar({ user, breadcrumb, onLogout }: Props) {
  const { pathname } = useLocation()
  const crumbs = buildCrumbs(pathname, useBreadcrumbLabel())
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      e.preventDefault()
      // Another dialog already owns the keyboard.
      if (document.querySelector('[aria-modal="true"]')) return
      // Focus the button first so closing the palette always returns focus to it.
      searchButton.current?.focus()
      setIsSearchOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between gap-6 border-b border-line bg-bg/90 px-[var(--gutter)] backdrop-blur-sm">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2.5 text-12 uppercase tracking-eyebrow text-muted">
        {breadcrumb ?? (
          <>
            <Link to="/" className="flex min-h-11 items-center">CMS</Link>
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="flex items-center gap-2.5">
                <span className="text-faint" aria-hidden="true">/</span>
                {c.to ? (
                  <Link to={c.to} className="flex min-h-11 items-center hover:text-ink">{c.label}</Link>
                ) : (
                  <span aria-current="page" className="text-ink">{c.label}</span>
                )}
              </span>
            ))}
          </>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <button
          ref={searchButton}
          type="button"
          aria-label="Search all content"
          aria-haspopup="dialog"
          onClick={() => setIsSearchOpen(true)}
          className="flex h-11 items-center gap-2.5 rounded-xs border border-line bg-surface px-3 text-13 text-muted md:min-w-60 max-[1024px]:min-w-11 max-[1024px]:justify-center max-[1024px]:px-0"
        >
          <Icon name="search" />
          <span className="max-[1024px]:hidden">Search records</span>
          <kbd className="ml-auto border border-line px-1.5 py-px font-ui text-11 tracking-[0.08em] text-faint max-[1024px]:hidden">⌘K</kbd>
        </button>
        <AccountMenu user={user} onLogout={onLogout} />
      </div>
      <CommandPalette open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  )
}
