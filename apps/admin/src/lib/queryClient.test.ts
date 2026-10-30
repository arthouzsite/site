import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { createQueryClient } from './queryClient'

describe('createQueryClient', () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (n: number, e: unknown) => boolean

  it('does not retry client errors', () => {
    expect(retry(0, new ApiError(404, { code: 'NOT_FOUND', message: 'x' }))).toBe(false)
  })
  it('retries server and network errors up to twice', () => {
    const err = new ApiError(500, { code: 'X', message: 'x' })
    expect(retry(0, err)).toBe(true)
    expect(retry(1, err)).toBe(true)
    expect(retry(2, err)).toBe(false)
  })
})
