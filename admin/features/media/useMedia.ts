import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { Media, MediaDetail, MediaKindFilter, UploadTarget } from './types'

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

/** The PUT is the slow part, so it owns the first 90% of the bar; the server-side finish owns the rest. */
const PUT_PROGRESS_SHARE = 0.9

/** Authorise, PUT straight to storage, then ask the server to record and process the object. */
async function uploadViaStorage({ file, alt, onProgress }: UploadArgs): Promise<Media> {
  const target = await api.post<UploadTarget>('/media/uploads', { filename: file.name, mime: file.type, bytes: file.size, alt })
  await api.putRaw(target.url, file, target.headers, (f) => onProgress?.(f * PUT_PROGRESS_SHARE))
  const media = await api.post<Media>('/media/uploads/complete', { key: target.key, alt })
  onProgress?.(1)
  return media
}

export function useUploadMedia() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: uploadViaStorage,
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
