import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NewsInput } from '@arthouz/shared'
import { api } from '../../lib/api'
import type { AdminNews, NewsQuery } from './types'

export function useNewsList(query: NewsQuery) {
  return useQuery({
    queryKey: ['news', query],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) })
      if (query.q) params.set('q', query.q)
      if (query.published) params.set('published', query.published)
      const { data, meta } = await api.getWithMeta<AdminNews[]>(`/news?${params}`)
      return { items: data, total: meta?.total ?? data.length }
    },
    placeholderData: keepPreviousData,
  })
}

export function useNewsItem(id: string | undefined) {
  return useQuery({ queryKey: ['news-item', id], queryFn: () => api.get<AdminNews>(`/news/${id}`), enabled: Boolean(id) })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => Promise.all([client.invalidateQueries({ queryKey: ['news'] }), client.invalidateQueries({ queryKey: ['news-item'] })])
}

export function useSaveNews(id: string | undefined) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<NewsInput>) => (id ? api.patch<AdminNews>(`/news/${id}`, input) : api.post<AdminNews>('/news', input)),
    onSuccess: invalidate,
  })
}

export function usePublishNews() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => api.patch<AdminNews>(`/news/${id}/publish`, { isPublished }),
    onSuccess: invalidate,
  })
}

export function useDeleteNews() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<unknown>(`/news/${id}`),
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ['news-item', id], exact: true })
      return client.invalidateQueries({ queryKey: ['news'], exact: false })
    },
  })
}

export type ExhibitionOption = { id: string; title: string; slug: string }

export function useExhibitionOptions(q: string) {
  return useQuery({
    queryKey: ['exhibitions', { q }],
    queryFn: () => api.get<ExhibitionOption[]>(`/exhibitions?${new URLSearchParams({ q, limit: '200' })}`),
    placeholderData: keepPreviousData,
  })
}
