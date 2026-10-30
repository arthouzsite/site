import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { api, ApiError } from '../../lib/api'

export type SessionUser = { id: string; email: string; name: string; role: 'ADMIN' | 'EDITOR' }
export const SESSION_KEY = ['session'] as const

/**
 * Signed out or expired: forget everything cached for the previous user, then mark the session as gone.
 * `client.clear()` would also detach the mounted session observer from its query, so the redirect to
 * /login would never render; the session entry is kept and set to null instead.
 */
export function endSession(client: QueryClient): void {
  client.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] })
  client.getMutationCache().clear()
  client.setQueryData(SESSION_KEY, null)
}

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
    onSettled: () => endSession(client),
  })
  const logout = useCallback(() => logoutMutation.mutateAsync().catch(() => undefined), [logoutMutation])

  return { user: query.data ?? null, isLoading: query.isPending, logout }
}
