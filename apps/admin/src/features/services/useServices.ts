import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ServiceInput } from '@arthouz/shared'
import { api } from '../../lib/api'
import type { AdminService, ServicesQuery } from './types'

export function useServices(query: ServicesQuery) {
  return useQuery({
    queryKey: ['services', 'list', query],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) })
      if (query.q) params.set('q', query.q)
      const { data, meta } = await api.getWithMeta<AdminService[]>(`/services?${params}`)
      return { items: data, total: meta?.total ?? data.length }
    },
    placeholderData: keepPreviousData,
  })
}

export function useService(id: string | undefined) {
  return useQuery({ queryKey: ['services', 'item', id], queryFn: () => api.get<AdminService>(`/services/${id}`), enabled: Boolean(id) })
}

/** Every service mutation refreshes the lists, single records and the dashboard. */
function useInvalidate() {
  const client = useQueryClient()
  return () => Promise.all([client.invalidateQueries({ queryKey: ['services'] }), client.invalidateQueries({ queryKey: ['dashboard'] })])
}

export function useSaveService(id: string | undefined) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<ServiceInput>) => (id ? api.patch<AdminService>(`/services/${id}`, input) : api.post<AdminService>('/services', input)),
    onSuccess: invalidate,
  })
}

export function usePublishService() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) => api.patch<AdminService>(`/services/${id}/publish`, { isPublished }),
    onSuccess: invalidate,
  })
}

export function useReorderServices() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (ids: string[]) => api.put<unknown>('/services/order', { ids }), onSuccess: invalidate })
}

export function useDeleteService() {
  const client = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => api.delete<unknown>(`/services/${id}`),
    onSuccess: (_data, id) => {
      client.removeQueries({ queryKey: ['services', 'item', id], exact: true })
      return invalidate()
    },
  })
}
