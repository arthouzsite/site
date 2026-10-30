import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LocationInput } from '@arthouz/shared'
import { api } from '../../lib/api'
import type { AdminLocation } from './types'

export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: () => api.get<AdminLocation[]>('/locations') })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['locations'] })
}

export function useSaveLocation(id: string | null) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<LocationInput>) => (id ? api.patch<AdminLocation>(`/locations/${id}`, input) : api.post<AdminLocation>('/locations', input)),
    onSuccess: invalidate,
  })
}

export function useReorderLocations() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (ids: string[]) => api.put<unknown>('/locations/order', { ids }), onSuccess: invalidate })
}

export function useDeleteLocation() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.delete<unknown>(`/locations/${id}`), onSuccess: invalidate })
}
