import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { AdminEnquiry, EnquiriesQuery } from './types'

export function useEnquiries(query: EnquiriesQuery) {
  return useQuery({
    queryKey: ['enquiries', 'list', query],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(query.page), limit: String(query.limit) })
      if (query.kind) params.set('kind', query.kind)
      const { data, meta } = await api.getWithMeta<AdminEnquiry[]>(`/enquiries?${params}`)
      return { items: data, total: meta?.total ?? data.length }
    },
    placeholderData: keepPreviousData,
  })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['enquiries'] })
}

export function useSetHandled() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, isHandled }: { id: string; isHandled: boolean }) => api.patch<AdminEnquiry>(`/enquiries/${id}`, { isHandled }),
    onSuccess: invalidate,
  })
}

export function useDeleteEnquiry() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.delete<unknown>(`/enquiries/${id}`), onSuccess: invalidate })
}
