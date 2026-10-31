import { afterEach, describe, expect, it, vi } from 'vitest'
import { logError } from './log'

describe('logError', () => {
  afterEach(() => vi.restoreAllMocks())

  it('writes the message and the stack to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logError('failed', 'stack-trace')
    expect(spy).toHaveBeenCalledWith('failed', 'stack-trace')
  })

  it('omits an absent stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logError('failed')
    expect(spy).toHaveBeenCalledWith('failed')
  })
})
