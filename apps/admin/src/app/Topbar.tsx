import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { Icon } from '../components/ui/Icon'
import { initials } from '../lib/format'
import type { SessionUser } from '../features/auth/useSession'

const SEGMENT_LABEL: Record<string, string> = { new: 'New', about: 'About page', settings: 'Home & settings' }

function defaultCrumbs(pathname: string): string[] {
  return pathname.split('/').filter(Boolean).map((s) => SEGMENT_LABEL[s] ?? s.charAt(0).toUpperCase() + s.slice(1))
}

type Props = { user: SessionUser; breadcrumb?: ReactNode; onLogout: () => void }

export function Topbar({ user, breadcrumb, onLogout }: Props) {
  const { pathname } = useLocation()
  const crumbs = defaultCrumbs(pathname)
  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between gap-6 border-b border-line bg-bg/90 px-[var(--gutter)] backdrop-blur-sm">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2.5 text-12 uppercase tracking-eyebrow text-muted">
        {breadcrumb ?? (
          <>
            <Link to="/" className="flex min-h-11 items-center">CMS</Link>
            {crumbs.map((c, i) => (
              <span key={`${c}-${i}`} className="flex items-center gap-2.5">
                <span className="text-faint" aria-hidden="true">/</span>
                <span {...(i === crumbs.length - 1 ? { 'aria-current': 'page' as const, className: 'text-ink' } : {})}>{c}</span>
              </span>
            ))}
          </>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Search all content"
          className="flex h-11 items-center gap-2.5 rounded-xs border border-line bg-surface px-3 text-13 text-muted md:min-w-60 max-[1024px]:min-w-11 max-[1024px]:justify-center max-[1024px]:px-0"
        >
          <Icon name="search" />
          <span className="max-[1024px]:hidden">Search records</span>
          <kbd className="ml-auto border border-line px-1.5 py-px font-ui text-11 tracking-[0.08em] text-faint max-[1024px]:hidden">⌘K</kbd>
        </button>
        <button type="button" onClick={onLogout} aria-label={`${user.name}, sign out`} title="Sign out" className="grid h-11 w-11 place-items-center rounded-full border-0 bg-transparent">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-amber text-12 font-semibold text-ink">{initials(user.name, user.email[0]?.toUpperCase() ?? "?")}</span>
        </button>
      </div>
    </header>
  )
}
