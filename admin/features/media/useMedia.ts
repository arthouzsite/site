import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api'
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

function authorise({ file, alt }: UploadArgs): Promise<UploadTarget> {
  return api.post<UploadTarget>('/media/uploads', { filename: file.name, mime: file.type, bytes: file.size, alt })
}

const isExpired = (target: UploadTarget): boolean => Date.parse(target.expiresAt) <= Date.now()

/** Storage answers 403 once the presigned signature has expired (targets live 15 minutes). */
const isRejectedPut = (err: unknown): boolean => err instanceof ApiError && err.code === 'UPLOAD_FAILED' && err.status === 403

/** PUTs the file, asking for a fresh target first when the first is already stale and once more when storage rejects it. */
async function putToStorage(args: UploadArgs): Promise<UploadTarget> {
  const { file, onProgress } = args
  const put = (target: UploadTarget) => api.putRaw(target.url, file, target.headers, (f) => onProgress?.(f * PUT_PROGRESS_SHARE))
  let target = await authorise(args)
  if (isExpired(target)) target = await authorise(args)
  try {
    await put(target)
    return target
  } catch (err) {
    if (!isRejectedPut(err)) throw err
  }
  onProgress?.(0)
  target = await authorise(args)
  await put(target)
  return target
}

/** Authorise, PUT straight to storage, then ask the server to record and process the object. */
async function uploadViaStorage(args: UploadArgs): Promise<Media> {
  const target = await putToStorage(args)
  const media = await api.post<Media>('/media/uploads/complete', { key: target.key, alt: args.alt })
  args.onProgress?.(1)
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
