import type { IconName } from '../components/ui/Icon'

export type NavItem = { to: string; label: string; icon: IconName; countKey?: string; adminOnly?: boolean; end?: boolean }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/exhibitions', label: 'Exhibitions', icon: 'exhibitions', countKey: 'exhibitions' },
  { to: '/artists', label: 'Artists', icon: 'artists', countKey: 'artists' },
  { to: '/fairs', label: 'Fairs', icon: 'fairs', countKey: 'fairs' },
  { to: '/news', label: 'News', icon: 'news', countKey: 'news' },
  { to: '/locations', label: 'Locations', icon: 'locations', countKey: 'locations' },
  { to: '/about', label: 'About page', icon: 'about' },
  { to: '/settings', label: 'Home & settings', icon: 'settings' },
  { to: '/media', label: 'Media', icon: 'media', countKey: 'media' },
  { to: '/users', label: 'Users', icon: 'users', adminOnly: true },
]
