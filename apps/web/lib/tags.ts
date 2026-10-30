/** Cache tags; names mirror `tagsFor` in @arthouz/shared, which the API posts to /api/revalidate. */
export const TAGS = {
  home: 'home',
  search: 'search',
  exhibitions: 'exhibitions',
  exhibition: (slug: string) => `exhibition:${slug}`,
  artists: 'artists',
  artist: (slug: string) => `artist:${slug}`,
  fairs: 'fairs',
  news: 'news',
  locations: 'locations',
  about: 'about',
  settings: 'settings',
} as const
