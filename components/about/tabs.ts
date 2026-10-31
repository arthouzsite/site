export const ABOUT_TABS = [
  { key: 'gallery', label: 'Gallery' },
  { key: 'proprietor', label: 'Proprietor' },
  { key: 'services', label: 'Services' },
  { key: 'publications', label: 'Publications' },
] as const

export type AboutTabKey = (typeof ABOUT_TABS)[number]['key']

export const DEFAULT_ABOUT_TAB: AboutTabKey = 'gallery'

/** Resolves a raw `?tab=` value; anything unknown falls back to Gallery. */
export function parseAboutTab(raw: string | null | undefined): AboutTabKey {
  return ABOUT_TABS.find((tab) => tab.key === raw)?.key ?? DEFAULT_ABOUT_TAB
}
