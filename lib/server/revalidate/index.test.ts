import { revalidateTag } from 'next/cache'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { logError } from '@/lib/server/log'
import { revalidateSite } from '.'

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }))
vi.mock('@/lib/server/log', () => ({ logError: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('revalidateSite', () => {
  it('expires each unique tag immediately', () => {
    revalidateSite(['home', 'artists', 'home'])
    expect(revalidateTag).toHaveBeenCalledTimes(2)
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'home', { expire: 0 })
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'artists', { expire: 0 })
  })

  it('does nothing for an empty list', () => {
    revalidateSite([])
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('swallows and logs a failure, and keeps going with the other tags', () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error('no static generation store')
    })
    expect(() => revalidateSite(['a', 'b'])).not.toThrow()
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('a'), expect.any(String))
    expect(revalidateTag).toHaveBeenCalledTimes(2)
  })

  it('logs a non-Error throwable without a stack', () => {
    vi.mocked(revalidateTag).mockImplementationOnce(() => {
      throw 'bad'
    })
    revalidateSite(['a'])
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('bad'), undefined)
  })
})
