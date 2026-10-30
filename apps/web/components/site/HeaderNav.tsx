import Link from 'next/link'
import { NAV_ITEMS, isActive } from '@/lib/nav'
import { SearchButton } from './SearchButton'

type Props = { pathname: string; onSearch: () => void }

/** Desktop navigation (≥ 880 px): uppercase links, active section in rust with a 1 px underline. */
export function HeaderNav({ pathname, onSearch }: Props) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-[clamp(18px,2.4vw,36px)] nav:flex">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`hit-44 border-b py-[6px] text-[12.5px] tracking-[0.16em] uppercase hover:text-rust ${active ? 'border-rust text-rust' : 'border-transparent text-ink'}`}
          >
            {item.label}
          </Link>
        )
      })}
      <SearchButton variant="desktop" onClick={onSearch} />
    </nav>
  )
}
