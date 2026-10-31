import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ExhibitionWorkInput } from '@/lib/shared'
import { api } from '../../lib/api'
import type { ArtistArtwork, ExhibitionWork } from './types'

const worksKey = (exhibitionId: string) => ['exhibition-works', exhibitionId] as const

export function useExhibitionWorks(exhibitionId: string | undefined) {
  return useQuery({
    queryKey: worksKey(exhibitionId ?? ''),
    queryFn: () => api.get<ExhibitionWork[]>(`/exhibitions/${exhibitionId}/works`),
    enabled: Boolean(exhibitionId),
  })
}

export function useAddWork(exhibitionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ExhibitionWorkInput) => api.post<ExhibitionWork>(`/exhibitions/${exhibitionId}/works`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: worksKey(exhibitionId) }),
  })
}

export function useImportWork(exhibitionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (artworkId: string) => api.post<ExhibitionWork>(`/exhibitions/${exhibitionId}/works/import`, { artworkId }),
    onSuccess: () => client.invalidateQueries({ queryKey: worksKey(exhibitionId) }),
  })
}

export function useRemoveWork(exhibitionId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (workId: string) => api.delete(`/works/${workId}`),
    onSuccess: () => client.invalidateQueries({ queryKey: worksKey(exhibitionId) }),
  })
}

/** Optimistic: the list reorders at once and rolls back if the server rejects the order. */
export function useReorderWorks(exhibitionId: string) {
  const client = useQueryClient()
  const key = worksKey(exhibitionId)
  return useMutation({
    mutationFn: (ids: string[]) => api.put(`/exhibitions/${exhibitionId}/works/order`, { ids }),
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<ExhibitionWork[]>(key)
      if (previous) client.setQueryData(key, ids.flatMap((id) => previous.filter((w) => w.id === id)))
      return { previous }
    },
    onError: (_err, _ids, ctx) => {
      if (ctx?.previous) client.setQueryData(key, ctx.previous)
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })
}

export function useArtistsArtworks(artistIds: string[]) {
  return useQueries({
    queries: artistIds.map((artistId) => ({
      queryKey: ['artist-artworks', artistId],
      queryFn: () => api.get<ArtistArtwork[]>(`/artists/${artistId}/artworks`),
    })),
  })
}
