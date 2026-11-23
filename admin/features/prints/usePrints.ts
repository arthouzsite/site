import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PrintCategoryInput } from '@/lib/shared'
import { api } from '../../lib/api'
import type { AdminPrintCategory } from './types'

const KEY = ['prints']

export function usePrintCategories() {
  return useQuery({ queryKey: KEY, queryFn: () => api.get<AdminPrintCategory[]>('/prints') })
}

function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: KEY })
}

export function useSavePrintCategory(id: string | null) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: Partial<PrintCategoryInput>) =>
      id ? api.patch<AdminPrintCategory>(`/prints/${id}`, input) : api.post<AdminPrintCategory>('/prints', input),
    onSuccess: invalidate,
  })
}

export function useReorderPrintCategories() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (ids: string[]) => api.put<unknown>('/prints/order', { ids }), onSuccess: invalidate })
}

export function useDeletePrintCategory() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.delete<unknown>(`/prints/${id}`), onSuccess: invalidate })
}
