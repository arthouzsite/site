import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role } from '@arthouz/shared'
import { api } from '../../lib/api'

export type User = {
  id: string
  email: string
  name: string
  role: Role
  isDisabled: boolean
  lastLoginAt: string | null
  createdAt: string
}
export type UserPatch = { name?: string; role?: Role; password?: string; isDisabled?: boolean }

const USERS_KEY = ['users'] as const

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: () => api.get<User[]>('/users') })
}

function useUsersMutation<V>(fn: (v: V) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: USERS_KEY }) })
}

export const useCreateUser = () =>
  useUsersMutation((v: { email: string; name: string; role: Role; password: string }) => api.post<User>('/users', v))
export const useUpdateUser = () => useUsersMutation(({ id, ...patch }: UserPatch & { id: string }) => api.patch<User>(`/users/${id}`, patch))
export const useDeleteUser = () => useUsersMutation((id: string) => api.delete<null>(`/users/${id}`))
