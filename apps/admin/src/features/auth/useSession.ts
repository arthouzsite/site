import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { api, ApiError } from '../../lib/api'

export type SessionUser = { id: string; email: string; name: string; role: 'ADMIN' | 'EDITOR' }
export const SESSION_KEY = ['session'] as const

export function useSession() {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async (): Promise<SessionUser | null> => {
      try {
        return await api.get<SessionUser>('/auth/me')
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  })
  const logoutMutation = useMutation({
    mutationFn: () => api.post<null>('/auth/logout'),
    onSettled: () => client.setQueryData(SESSION_KEY, null),
  })
  const logout = useCallback(() => logoutMutation.mutateAsync().catch(() => undefined), [logoutMutation])

  return { user: query.data ?? null, isLoading: query.isPending, logout }
}
