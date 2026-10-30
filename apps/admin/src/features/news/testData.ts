import type { AdminNews } from './types'

export function makeNews(over: Partial<AdminNews> = {}): AdminNews {
  return {
    id: 'n1', slug: 'solo-show', title: 'A Solo Show', excerpt: 'Excerpt', publishedAt: '2024-02-01T00:00:00.000Z', imageId: null,
    externalUrl: null, exhibitionId: null, isPublished: true, image: null, monthLabel: 'February 2024', exhibition: null, ...over,
  }
}
