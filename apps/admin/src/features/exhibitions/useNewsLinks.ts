import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { NewsLink } from './types'

const NEWS_LIMIT = 200
const newsKey = { q: '', limit: NEWS_LIMIT }

export function useNewsList() {
  return useQuery({ queryKey: ['news', newsKey], queryFn: () => api.get<NewsLink[]>(`/news?q=&limit=${NEWS_LIMIT}`) })
}

type NewsDetail = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
  imageId: string | null
  externalUrl: string | null
  isPublished: boolean
}

/** PATCH /news takes the full news input, so the item is fetched first and only `exhibitionId` changes. */
export function useLinkNews(exhibitionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (newsId: string) => {
      const n = await api.get<NewsDetail>(`/news/${newsId}`)
      return api.patch(`/news/${newsId}`, {
        slug: n.slug,
        title: n.title,
        excerpt: n.excerpt,
        publishedAt: n.publishedAt,
        imageId: n.imageId,
        externalUrl: n.externalUrl,
        exhibitionId,
        isPublished: n.isPublished,
      })
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['news'] }),
  })
}
