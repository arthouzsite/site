import { NavLink } from 'react-router'
import { Icon } from '../components/ui/Icon'
import type { SessionUser } from '../features/auth/useSession'
import { NAV_ITEMS } from './navItems'

type Props = { user: SessionUser; counts?: Record<string, number> }

type SiteEnv = { VITE_PUBLIC_SITE_URL?: string; VITE_WEB_URL?: string }

/** Target of the sidebar link; `/` (this admin's own origin) is the last resort. */
export function publicSiteUrl(env: SiteEnv): string {
  return env.VITE_PUBLIC_SITE_URL || env.VITE_WEB_URL || '/'
}

const PUBLIC_SITE_URL = publicSiteUrl(import.meta.env)
const ROLE_LABEL: Record<SessionUser['role'], string> = { ADMIN: 'Admin', EDITOR: 'Editor' }

export function Sidebar({ user, counts = {} }: Props) {
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || user.role === 'ADMIN')
  return (
    <aside
      aria-label="CMS navigation"
      className="sticky top-0 flex h-screen flex-col overflow-auto bg-ink pb-6 text-paper max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:z-30 max-sm:h-14 max-sm:w-full max-sm:flex-row max-sm:overflow-visible max-sm:p-0"
    >
      <NavLink to="/" aria-label="Art Houz CMS home" className="flex h-topbar items-end gap-2.5 border-b border-line-dark px-6 pb-[22px] max-[1024px]:justify-center max-[1024px]:px-0 max-sm:hidden">
        <span className="brand-mark" />
        <span className="text-14 font-medium leading-none tracking-brand max-[1024px]:hidden">ART HOUZ</span>
      </NavLink>
      <div className="px-6 pb-2 pt-5 text-11 uppercase tracking-eyebrow text-on-dark-muted max-[1024px]:hidden">Content</div>
      <nav aria-label="Sections" className="flex flex-col max-sm:w-full max-sm:flex-row max-sm:overflow-x-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            aria-label={item.label}
            className={({ isActive }) =>
              [
                'flex h-11 items-center justify-between gap-3 border-l-2 px-6 text-14 transition-colors hover:bg-hover-dark hover:text-paper',
                'max-[1024px]:justify-center max-[1024px]:px-0 max-sm:h-14 max-sm:flex-[1_0_56px] max-sm:border-l-0 max-sm:border-t-2',
                isActive ? 'border-amber bg-active-dark text-paper' : 'border-transparent text-on-dark-muted',
              ].join(' ')
            }
          >
            <span className="flex items-center gap-2">
              <Icon name={item.icon} />
              <span className="max-[1024px]:hidden">{item.label}</span>
            </span>
            {item.countKey && counts[item.countKey] !== undefined && (
              <span className="text-12 text-faint max-[1024px]:hidden">{counts[item.countKey]}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-1.5 border-t border-line-dark px-6 pt-4 text-12 text-on-dark-muted max-[1024px]:hidden">
        <a href={PUBLIC_SITE_URL} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 hover:text-amber">
          <Icon name="external" /> View public site
        </a>
        <span>Signed in as {user.name} · {ROLE_LABEL[user.role]}</span>
      </div>
    </aside>
  )
}
