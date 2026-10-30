import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Media, MediaDetail, MediaKindFilter } from './types'

export const MEDIA_PAGE_SIZE = 18
export const PICKER_PAGE_SIZE = 12

export type MediaQuery = { q: string; page: number; missingAlt: boolean; limit: number; kind?: MediaKindFilter }
type MediaList = { items: Media[]; total: number }

async function fetchList({ q, page, missingAlt, limit, kind }: MediaQuery): Promise<MediaList> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  if (missingAlt) params.set('missingAlt', 'true')
  if (kind) params.set('kind', kind)
  const { data, meta } = await api.getWithMeta<Media[]>(`/media?${params}`)
  return { items: data, total: meta?.total ?? data.length }
}

export function useMediaList(query: MediaQuery) {
  const { q, page, missingAlt, limit, kind = '' } = query
  return useQuery({
    queryKey: ['media', { q, page, missingAlt, limit, kind }],
    queryFn: () => fetchList(query),
    placeholderData: keepPreviousData,
  })
}

export function useMediaDetail(id: string, enabled = true) {
  return useQuery({ queryKey: ['media', id], queryFn: () => api.get<MediaDetail>(`/media/${id}`), enabled })
}

type UploadArgs = { file: File; alt: string; onProgress?: (fraction: number) => void }

export function useUploadMedia() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ file, alt, onProgress }: UploadArgs) => {
      const form = new FormData()
      form.append('file', file)
      form.append('alt', alt)
      return api.upload<Media>('/media', form, onProgress)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['media'] }),
  })
}

export function useUpdateMedia(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { alt?: string; caption?: string | null }) => api.patch<Media>(`/media/${id}`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['media'] }),
  })
}

export function useDeleteMedia(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<null>(`/media/${id}`),
    onSuccess: () => {
      // The detail query would 404 (and retry) once the row is gone, so drop it before refreshing lists.
      client.removeQueries({ queryKey: ['media', id], exact: true })
      return client.invalidateQueries({ queryKey: ['media'] })
    },
  })
}
