import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExhibitionInput } from '@/lib/shared'
import { api } from '../../lib/api'
import type { AdminExhibition, ArtistLite } from './types'

export const EXHIBITIONS_PAGE_SIZE = 20
const CITIES_STALE_MS = 5 * 60 * 1000

export type ExhibitionQuery = { status: string; city: string; published: string; q: string; page: number }
type ExhibitionList = { items: AdminExhibition[]; total: number }

async function fetchList(query: ExhibitionQuery): Promise<ExhibitionList> {
  const params = new URLSearchParams({ page: String(query.page), limit: String(EXHIBITIONS_PAGE_SIZE) })
  for (const key of ['status', 'city', 'published', 'q'] as const) {
    if (query[key]) params.set(key, query[key])
  }
  const { data, meta } = await api.getWithMeta<AdminExhibition[]>(`/exhibitions?${params}`)
  return { items: data, total: meta?.total ?? data.length }
}

export function useExhibitionList(query: ExhibitionQuery) {
  return useQuery({ queryKey: ['exhibitions', query], queryFn: () => fetchList(query), placeholderData: keepPreviousData })
}

export function useExhibitionCities() {
  return useQuery({
    queryKey: ['exhibitions', 'cities'],
    staleTime: CITIES_STALE_MS,
    queryFn: async () => {
      const all = await api.get<AdminExhibition[]>('/exhibitions?limit=200')
      return [...new Set(all.map((e) => e.city))].sort((a, b) => a.localeCompare(b))
    },
  })
}

export function useExhibition(id: string | undefined) {
  return useQuery({ queryKey: ['exhibition', id], queryFn: () => api.get<AdminExhibition>(`/exhibitions/${id}`), enabled: Boolean(id) })
}

export function useCreateExhibition() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ExhibitionInput) => api.post<AdminExhibition>('/exhibitions', body),
    onSuccess: () => client.invalidateQueries({ queryKey: ['exhibitions'] }),
  })
}

/** Thrown when the details saved but the artist order did not. */
export class ArtistsNotSavedError extends Error {
  readonly cause: unknown
  constructor(cause: unknown) {
    super('Details saved, but the artist list was not — try again')
    this.name = 'ArtistsNotSavedError'
    this.cause = cause
  }
}

type SaveArgs = { body: ExhibitionInput; artists: ArtistLite[] | null }

/** PATCH, then (when the order changed) PUT artists, then invalidate once so nothing remounts mid-sequence. */
export function useSaveExhibition(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ body, artists }: SaveArgs) => {
      await api.patch<AdminExhibition>(`/exhibitions/${id}`, body)
      if (artists) {
        try {
          await api.put(`/exhibitions/${id}/artists`, { ids: artists.map((a) => a.id) })
        } catch (err) {
          void client.invalidateQueries({ queryKey: ['exhibitions'] })
          throw new ArtistsNotSavedError(err)
        }
      }
      await Promise.all([client.invalidateQueries({ queryKey: ['exhibition', id] }), client.invalidateQueries({ queryKey: ['exhibitions'] })])
    },
  })
}

export function usePublishExhibition() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => api.patch(`/exhibitions/${id}/publish`, { isPublished }),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['exhibitions'] }), client.invalidateQueries({ queryKey: ['exhibition'] })]),
  })
}

export function useBulkPublish() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, isPublished }: { ids: string[]; isPublished: boolean }) => api.patch('/exhibitions/publish', { ids, isPublished }),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['exhibitions'] }), client.invalidateQueries({ queryKey: ['exhibition'] })]),
  })
}

export function useDeleteExhibition() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/exhibitions/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['exhibitions'] }),
  })
}

export function useArtistSearch(q: string) {
  return useQuery({
    queryKey: ['artists', { q }],
    queryFn: () => api.get<ArtistLite[]>(`/artists?${new URLSearchParams({ q, limit: '200' })}`),
    enabled: q.length > 0,
  })
}
