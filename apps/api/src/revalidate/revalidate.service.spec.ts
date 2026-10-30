import { Logger } from '@nestjs/common'
import { env } from '../config/env'
import { RevalidateService } from './revalidate.service'

const flush = () => new Promise((resolve) => setImmediate(resolve))

describe('RevalidateService', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
    jest.restoreAllMocks()
  })

  it('posts de-duplicated tags with the secret header', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    new RevalidateService().trigger(['a', 'b', 'a'])
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${env.WEB_URL}/api/revalidate`)
    expect((init.headers as Record<string, string>)['x-revalidate-secret']).toBe(env.REVALIDATE_SECRET)
    expect(JSON.parse(init.body as string)).toEqual({ tags: ['a', 'b'] })
  })

  it('never throws and logs a warning when fetch rejects', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    expect(() => new RevalidateService().trigger(['a'])).not.toThrow()
    await flush()
    expect(warn).toHaveBeenCalled()
  })

  it('logs a warning on a non-2xx response', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation()
    new RevalidateService().trigger(['a'])
    await flush()
    expect(warn).toHaveBeenCalled()
  })

  it('does nothing for an empty tag list', async () => {
    const fetchMock = jest.fn()
    globalThis.fetch = fetchMock as unknown as typeof fetch
    new RevalidateService().trigger([])
    await flush()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('RevalidateService timeout', () => {
  const realFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = realFetch
  })

  it('passes an abort signal so a hung web app cannot pile up requests', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    new RevalidateService().trigger(['a'])
    await flush()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })
})
