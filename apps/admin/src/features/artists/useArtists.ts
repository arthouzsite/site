import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { errorMessage } from './errors'
import { FEATURED_LIMIT, type AdminArtist, type ArtistExhibition, type ArtistListParams, type Artwork } from './types'

const EXHIBITION_LIMIT = 50

export type ArtistPayload = {
  name: string
  sortName: string
  slug?: string
  medium: string
  base: string
  born: string | null
  lede: string
  bio: string
  portraitImageId: string | null
}

export type ArtworkPayload = {
  title: string
  year: string
  medium: string
  size: string
  imageId: string | null
  isPublished: boolean
}

function listQuery(params: Partial<ArtistListParams>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== null) search.set(key, String(value))
  }
  return search.toString()
}

export function useArtistList(params: ArtistListParams) {
  return useQuery({
    queryKey: ['artists', params],
    queryFn: async () => {
      const { data, meta } = await api.getWithMeta<AdminArtist[]>(`/artists?${listQuery(params)}`)
      return { items: data, total: meta?.total ?? data.length }
    },
    placeholderData: keepPreviousData,
  })
}

export const FEATURED_PARAMS = { featured: 'true', limit: FEATURED_LIMIT } as const

/** Featured artists in their display order (the API lists by sort name). */
export function useFeaturedArtists() {
  return useQuery({
    queryKey: ['artists', FEATURED_PARAMS],
    queryFn: async () => {
      const data = await api.get<AdminArtist[]>(`/artists?${listQuery(FEATURED_PARAMS)}`)
      return [...data].sort((a, b) => a.featuredOrder - b.featuredOrder)
    },
  })
}

export function useArtist(id: string | undefined) {
  return useQuery({ queryKey: ['artist', id], queryFn: () => api.get<AdminArtist>(`/artists/${id}`), enabled: Boolean(id) })
}

export function useArtistArtworks(artistId: string | null) {
  return useQuery({
    queryKey: ['artist-artworks', artistId],
    queryFn: () => api.get<Artwork[]>(`/artists/${artistId}/artworks`),
    enabled: Boolean(artistId),
  })
}

export function useArtistExhibitions(artistId: string | undefined) {
  return useQuery({
    queryKey: ['artist-exhibitions', artistId],
    queryFn: () => api.get<ArtistExhibition[]>(`/exhibitions?${new URLSearchParams({ artistId: artistId ?? '', limit: String(EXHIBITION_LIMIT) })}`),
    enabled: Boolean(artistId),
  })
}

export function useHomeFocus() {
  return useQuery({ queryKey: ['settings', 'homeFocus'], queryFn: () => api.get<{ artistId: string | null }>('/settings/homeFocus') })
}

function useRefreshArtists() {
  const client = useQueryClient()
  return (id?: string) =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['artists'] }),
      id ? client.invalidateQueries({ queryKey: ['artist', id] }) : Promise.resolve(),
    ])
}

export function useSaveArtist(id: string | null) {
  const refresh = useRefreshArtists()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ArtistPayload) => (id ? api.patch<AdminArtist>(`/artists/${id}`, body) : api.post<AdminArtist>('/artists', body)),
    onSuccess: (saved) => {
      client.setQueryData(['artist', saved.id], saved)
      return refresh(saved.id)
    },
  })
}

export function usePublishArtist() {
  const refresh = useRefreshArtists()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => api.patch<AdminArtist>(`/artists/${id}/publish`, { isPublished }),
    onSuccess: (_saved, { id }) => refresh(id),
    onError: (err) => toast.error(errorMessage(err)),
  })
}

export function useFeatureArtist() {
  const refresh = useRefreshArtists()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, isFeatured }: { id: string; isFeatured: boolean }) => api.patch<AdminArtist>(`/artists/${id}/feature`, { isFeatured }),
    onSuccess: (_saved, { id }) => refresh(id),
    onError: (err) => toast.error(errorMessage(err)),
  })
}

export function useReorderFeatured() {
  const client = useQueryClient()
  const toast = useToast()
  const key = ['artists', FEATURED_PARAMS]
  return useMutation({
    mutationFn: (ids: string[]) => api.put<AdminArtist[]>('/artists/featured-order', { ids }),
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<AdminArtist[]>(key)
      if (previous) {
        const byId = new Map(previous.map((a) => [a.id, a]))
        client.setQueryData(key, ids.flatMap((id) => byId.get(id) ?? []))
      }
      return { previous }
    },
    onError: (err, _ids, ctx) => {
      if (ctx?.previous) client.setQueryData(key, ctx.previous)
      toast.error(errorMessage(err))
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['artists'] }),
  })
}

export function useDeleteArtist() {
  const refresh = useRefreshArtists()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string }>(`/artists/${id}`),
    onSuccess: () => refresh(),
  })
}

function useRefreshArtworks(artistId: string | null) {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['artist-artworks', artistId] }),
      client.invalidateQueries({ queryKey: ['artists'] }),
    ])
}

export function useSaveArtwork(artistId: string | null) {
  const refresh = useRefreshArtworks(artistId)
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: ArtworkPayload }) =>
      id ? api.patch<Artwork>(`/artworks/${id}`, body) : api.post<Artwork>(`/artists/${artistId}/artworks`, body),
    onSuccess: refresh,
  })
}

export function useDeleteArtwork(artistId: string | null) {
  const refresh = useRefreshArtworks(artistId)
  return useMutation({ mutationFn: (id: string) => api.delete<{ id: string }>(`/artworks/${id}`), onSuccess: refresh })
}

export function useReorderArtworks(artistId: string | null) {
  const client = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (ids: string[]) => api.put<Artwork[]>(`/artists/${artistId}/artworks/order`, { ids }),
    onSuccess: (list) => client.setQueryData(['artist-artworks', artistId], list),
    onError: (err) => toast.error(errorMessage(err)),
  })
}
