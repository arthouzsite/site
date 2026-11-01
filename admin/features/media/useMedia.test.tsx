import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { ApiError } from '../../lib/api'
import { HttpResponse, http, server } from '../../test/msw'
import { mockUploadFlow } from '../../test/uploadMocks'
import { makeMedia } from './testUtils'
import { useUploadMedia } from './useMedia'

const jpeg = () => new File(['pixels'], 'hero.jpg', { type: 'image/jpeg' })

function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, ...renderHook(() => useUploadMedia(), { wrapper }) }
}

describe('useUploadMedia', () => {
  it('authorises, PUTs the file and completes, ending progress at 1', async () => {
    const calls = mockUploadFlow({ complete: ({ alt }) => makeMedia({ alt }) })
    const { result, client } = setup()
    const invalidate = client.invalidateQueries.bind(client)
    const invalidated: unknown[] = []
    client.invalidateQueries = ((filters: unknown) => {
      invalidated.push(filters)
      return invalidate(filters as never)
    }) as typeof client.invalidateQueries
    const progress: number[] = []
    let media: unknown
    await act(async () => {
      media = await result.current.mutateAsync({ file: jpeg(), alt: 'A hero', onProgress: (f) => progress.push(f) })
    })
    expect(media).toMatchObject({ alt: 'A hero' })
    expect(calls.authorised).toEqual([{ filename: 'hero.jpg', mime: 'image/jpeg', bytes: 6, alt: 'A hero' }])
    expect(calls.puts).toEqual([{ key: 'arthouz/2026/hero.jpg', contentType: 'image/jpeg', bytes: 6 }])
    expect(calls.completed).toEqual([{ key: 'arthouz/2026/hero.jpg', alt: 'A hero' }])
    // MSW reports the PUT as fully sent, which the hook scales to 0.9 before the final 1 after `complete`.
    expect(progress).toEqual([0.9, 1])
    expect(invalidated).toContainEqual({ queryKey: ['media'] })
  })

  it('uploads to an absolute storage URL', async () => {
    const calls = mockUploadFlow({ targetUrl: (key) => `https://bucket.r2.example/${key}` })
    const puts: string[] = []
    server.use(
      http.put('https://bucket.r2.example/*', ({ request }) => {
        puts.push(request.headers.get('content-type') ?? '')
        return new HttpResponse(null, { status: 200 })
      }),
    )
    const { result } = setup()
    await act(async () => {
      await result.current.mutateAsync({ file: jpeg(), alt: 'A hero' })
    })
    expect(puts).toEqual(['image/jpeg'])
    expect(calls.completed).toHaveLength(1)
  })

  it('fails with UPLOAD_BLOCKED and never completes when storage refuses the PUT', async () => {
    const calls = mockUploadFlow({ targetUrl: (key) => `https://bucket.r2.example/${key}` })
    server.use(http.put('https://bucket.r2.example/*', () => HttpResponse.error()))
    const { result } = setup()
    const progress: number[] = []
    await act(async () => {
      await expect(result.current.mutateAsync({ file: jpeg(), alt: 'A hero', onProgress: (f) => progress.push(f) })).rejects.toMatchObject({
        code: 'UPLOAD_BLOCKED',
        message: 'The storage at https://bucket.r2.example refused the upload. Check the bucket CORS rule.',
      })
    })
    expect(calls.completed).toEqual([])
    expect(progress).not.toContain(1)
  })

  it('stops after a refused authorisation without touching storage', async () => {
    const calls = mockUploadFlow({ authorise: () => { throw new ApiError(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'no' }) } })
    const { result } = setup()
    await act(async () => {
      await expect(result.current.mutateAsync({ file: jpeg(), alt: 'A hero' })).rejects.toMatchObject({ status: 415 })
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(calls.puts).toEqual([])
    expect(calls.completed).toEqual([])
  })

  describe('when the presigned target has expired', () => {
    const keyFor = (filename: string, attempt: number) => `arthouz/2026/${attempt}-${filename}`

    it('asks for a fresh target after a 403 and completes with the new key', async () => {
      const calls = mockUploadFlow({ keyFor, putStatus: (key) => (key.includes('/1-') ? 403 : 200) })
      const { result } = setup()
      const progress: number[] = []
      await act(async () => {
        await result.current.mutateAsync({ file: jpeg(), alt: 'A hero', onProgress: (f) => progress.push(f) })
      })
      expect(calls.authorised).toHaveLength(2)
      expect(calls.authorised[1]).toEqual(calls.authorised[0])
      expect(calls.puts.map((p) => p.key)).toEqual(['arthouz/2026/1-hero.jpg', 'arthouz/2026/2-hero.jpg'])
      expect(calls.completed).toEqual([{ key: 'arthouz/2026/2-hero.jpg', alt: 'A hero' }])
      expect(progress).toContain(0)
      expect(progress.at(-1)).toBe(1)
    })

    it('surfaces the second 403 without retrying again or completing', async () => {
      const calls = mockUploadFlow({ keyFor, putStatus: () => 403 })
      const { result } = setup()
      await act(async () => {
        await expect(result.current.mutateAsync({ file: jpeg(), alt: 'A hero' })).rejects.toMatchObject({
          status: 403,
          code: 'UPLOAD_FAILED',
          message: 'Storage returned 403',
        })
      })
      expect(calls.authorised).toHaveLength(2)
      expect(calls.puts).toHaveLength(2)
      expect(calls.completed).toEqual([])
    })

    it('does not retry other storage failures', async () => {
      const calls = mockUploadFlow({ putStatus: () => 500 })
      const { result } = setup()
      await act(async () => {
        await expect(result.current.mutateAsync({ file: jpeg(), alt: 'A hero' })).rejects.toMatchObject({ status: 500, code: 'UPLOAD_FAILED' })
      })
      expect(calls.authorised).toHaveLength(1)
    })

    it('fetches a fresh target before the PUT when expiresAt is already in the past', async () => {
      const calls = mockUploadFlow({
        keyFor,
        expiresAt: (attempt) => new Date(Date.now() + (attempt === 1 ? -1000 : 900_000)).toISOString(),
      })
      const { result } = setup()
      await act(async () => {
        await result.current.mutateAsync({ file: jpeg(), alt: 'A hero' })
      })
      expect(calls.authorised).toHaveLength(2)
      expect(calls.puts.map((p) => p.key)).toEqual(['arthouz/2026/2-hero.jpg'])
      expect(calls.completed).toEqual([{ key: 'arthouz/2026/2-hero.jpg', alt: 'A hero' }])
    })
  })
})
