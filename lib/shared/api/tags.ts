export type TagEntity = 'exhibition' | 'artist' | 'artwork' | 'fair' | 'service' | 'news' | 'location' | 'setting' | 'media'

const BASE_TAGS = ['home', 'search'] as const

function entityTags(entity: TagEntity, slug?: string): string[] {
  switch (entity) {
    case 'exhibition':
      return ['exhibitions', ...(slug ? [`exhibition:${slug}`] : []), 'artists']
    case 'artist':
    case 'artwork':
      return ['artists', ...(slug ? [`artist:${slug}`] : []), 'exhibitions']
    case 'fair':
      return ['fairs']
    case 'service':
      return ['services', ...(slug ? [`service:${slug}`] : [])]
    case 'news':
      return ['news', 'exhibitions']
    case 'location':
      return ['locations', 'about']
    case 'setting':
      return ['settings', 'about', 'artists']
    case 'media':
      return []
  }
}

export function tagsFor(entity: TagEntity, slug?: string): string[] {
  return Array.from(new Set([...BASE_TAGS, ...entityTags(entity, slug)]))
}
