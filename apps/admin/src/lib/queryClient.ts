import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

const MAX_RETRIES = 2

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < MAX_RETRIES,
      },
    },
  })
}
