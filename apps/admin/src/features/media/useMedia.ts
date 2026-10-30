import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
import type { Media, MediaDetail } from './types'

export const MEDIA_PAGE_SIZE = 18

export type MediaQuery = { q: string; page: number; missingAlt: boolean; limit?: number }
type MediaList = { items: Media[]; total: number }

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4100').replace(/\/$/, '')
const NETWORK_ERROR = { code: 'NETWORK_ERROR', message: 'Could not reach the server. Check your connection and try again.' }

type ListEnvelope = { ok: boolean; data: Media[] | null; error: { code: string; message: string } | null; meta?: { total: number } }

// `api.get` unwraps `data` and drops `meta`, which carries the pagination total, so the list reads the envelope itself.
async function fetchList({ q, page, missingAlt, limit = MEDIA_PAGE_SIZE }: MediaQuery): Promise<MediaList> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (q) params.set('q', q)
  if (missingAlt) params.set('missingAlt', 'true')
  let res: Response
  try {
    res = await fetch(`${API_URL}/media?${params}`, { credentials: 'include' })
  } catch {
    throw new ApiError(0, NETWORK_ERROR)
  }
  const env = (await res.json().catch(() => null)) as ListEnvelope | null
  if (!res.ok || !env?.ok || !env.data) {
    throw new ApiError(res.status, env?.error ?? { code: 'HTTP_ERROR', message: `Request failed (${res.status})` })
  }
  return { items: env.data, total: env.meta?.total ?? env.data.length }
}

export function useMediaList(query: MediaQuery) {
  const { q, page, missingAlt } = query
  return useQuery({
    queryKey: ['media', { q, page, missingAlt }],
    queryFn: () => fetchList(query),
    placeholderData: keepPreviousData,
  })
}

export function useMediaDetail(id: string) {
  return useQuery({ queryKey: ['media', id], queryFn: () => api.get<MediaDetail>(`/media/${id}`) })
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
    onSuccess: () => client.invalidateQueries({ queryKey: ['media'] }),
  })
}
