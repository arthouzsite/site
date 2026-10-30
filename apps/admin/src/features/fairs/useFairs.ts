import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FairInput } from '@arthouz/shared'
import { api } from '../../lib/api'
import type { AdminFair } from './types'

export function useFairs() {
  return useQuery({ queryKey: ['fairs'], queryFn: () => api.get<AdminFair[]>('/fairs') })
}

export function useFair(id: string | undefined) {
  return useQuery({ queryKey: ['fair', id], queryFn: () => api.get<AdminFair>(`/fairs/${id}`), enabled: Boolean(id) })
}

/** Every fair mutation refreshes the list and the single-record cache. */
function useInvalidate() {
  const client = useQueryClient()
  return () => Promise.all([client.invalidateQueries({ queryKey: ['fairs'] }), client.invalidateQueries({ queryKey: ['fair'] })])
}

export function useSaveFair(id: string | undefined) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<FairInput>) => (id ? api.patch<AdminFair>(`/fairs/${id}`, input) : api.post<AdminFair>('/fairs', input)),
    onSuccess: invalidate,
  })
}

export function usePublishFair() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => api.patch<AdminFair>(`/fairs/${id}/publish`, { isPublished }),
    onSuccess: invalidate,
  })
}

export function useReorderFairs() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (ids: string[]) => api.put<unknown>('/fairs/order', { ids }), onSuccess: invalidate })
}

export function useDeleteFair() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.delete<unknown>(`/fairs/${id}`), onSuccess: invalidate })
}
