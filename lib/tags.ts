/** Cache tags; names mirror `tagsFor` in @/lib/shared, which CMS writes expire through `revalidateSite`. */
export const TAGS = {
  home: 'home',
  search: 'search',
  exhibitions: 'exhibitions',
  exhibition: (slug: string) => `exhibition:${slug}`,
  artists: 'artists',
  artist: (slug: string) => `artist:${slug}`,
  fairs: 'fairs',
  services: 'services',
  service: (slug: string) => `service:${slug}`,
  news: 'news',
  locations: 'locations',
  about: 'about',
  settings: 'settings',
} as const
