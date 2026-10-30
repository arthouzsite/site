export type NavItem = { readonly label: string; readonly href: string }

/** Primary navigation, in the prototype's order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Artists', href: '/artists' },
  { label: 'Fairs', href: '/fairs' },
  { label: 'News', href: '/news' },
  { label: 'About', href: '/about' },
  { label: 'Visit', href: '/visit' },
]

export const FOOTER_NAV: readonly NavItem[] = [
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Artists', href: '/artists' },
  { label: 'Fairs', href: '/fairs' },
  { label: 'News', href: '/news' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/visit' },
]

/** A section is active on its index and on any detail page beneath it (e.g. /exhibitions/tidewater). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
