/** Services is a link that also opens a dropdown of the published services. */
export const SERVICES_HREF = '/services'

/** Prints is a link that also opens a dropdown of the print categories. */
export const PRINTS_HREF = '/prints'

/** One entry of a navigation dropdown; it links to `<section>/<slug>`. */
export type NavChild = { readonly slug: string; readonly title: string }

export type NavItem = { readonly label: string; readonly href: string }

/** Primary navigation, in the prototype's order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Artists', href: '/artists' },
  { label: 'Fairs', href: '/fairs' },
  { label: 'News', href: '/news' },
  { label: 'Services', href: SERVICES_HREF },
  { label: 'Prints', href: PRINTS_HREF },
  { label: 'About', href: '/about' },
  { label: 'Visit', href: '/visit' },
]

export const FOOTER_NAV: readonly NavItem[] = [
  { label: 'Exhibitions', href: '/exhibitions' },
  { label: 'Artists', href: '/artists' },
  { label: 'Fairs', href: '/fairs' },
  { label: 'News', href: '/news' },
  { label: 'Services', href: SERVICES_HREF },
  { label: 'Prints', href: PRINTS_HREF },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/visit' },
]

/** A section is active on its index and on any detail page beneath it (e.g. /exhibitions/tidewater). */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}
