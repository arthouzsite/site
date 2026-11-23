import Link from 'next/link'
import type { MouseEvent } from 'react'
import { NAV_ITEMS, PRINTS_HREF, SERVICES_HREF, isActive, type NavChild } from '@/lib/nav'
import { NavDropdownItem } from './NavDropdownItem'
import { navLinkClass } from './navLinkClass'
import { SearchButton } from './SearchButton'

type Props = {
  pathname: string
  services: readonly NavChild[]
  prints?: readonly NavChild[]
  onSearch: (event: MouseEvent<HTMLElement>) => void
}

/** Desktop navigation (≥ 880 px): uppercase links, active section in rust with a 1 px underline. */
export function HeaderNav({ pathname, services, prints = [], onSearch }: Props) {
  const dropdowns: Record<string, { links: readonly NavChild[]; toggleLabel: string }> = {
    [SERVICES_HREF]: { links: services, toggleLabel: 'Show services' },
    [PRINTS_HREF]: { links: prints, toggleLabel: 'Show print categories' },
  }
  return (
    <nav aria-label="Main" className="hidden items-center gap-[clamp(16px,2.1vw,36px)] self-stretch nav:flex">
      {NAV_ITEMS.map((item) => {
        const dropdown = dropdowns[item.href]
        if (dropdown && dropdown.links.length > 0) {
          return <NavDropdownItem key={item.href} item={item} pathname={pathname} links={dropdown.links} toggleLabel={dropdown.toggleLabel} />
        }
        const active = isActive(pathname, item.href)
        return (
          <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={navLinkClass(active)}>
            {item.label}
          </Link>
        )
      })}
      <SearchButton variant="desktop" onClick={onSearch} />
    </nav>
  )
}
