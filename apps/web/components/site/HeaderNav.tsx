import Link from 'next/link'
import type { MouseEvent } from 'react'
import { NAV_ITEMS, SERVICES_HREF, isActive } from '@/lib/nav'
import type { NavService } from '@/lib/services'
import { navLinkClass } from './navLinkClass'
import { SearchButton } from './SearchButton'
import { ServicesNavItem } from './ServicesNavItem'

type Props = { pathname: string; services: readonly NavService[]; onSearch: (event: MouseEvent<HTMLElement>) => void }

/** Desktop navigation (≥ 880 px): uppercase links, active section in rust with a 1 px underline. */
export function HeaderNav({ pathname, services, onSearch }: Props) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-[clamp(18px,2.4vw,36px)] self-stretch nav:flex">
      {NAV_ITEMS.map((item) => {
        if (item.href === SERVICES_HREF && services.length > 0) {
          return <ServicesNavItem key={item.href} item={item} pathname={pathname} services={services} />
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
