// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchOverlay } from '@/components/site/SearchOverlay'
import { APP_ROOT_ID } from '@/lib/dom'

const DEBOUNCE_MS = 200
const GROUPS = [
  { label: 'Artists', items: [{ label: 'Vijay Pichumani', href: '/artists/vijay-pichumani' }] },
  { label: 'News', items: [{ label: 'A show', href: '/news' }] },
]

function json(body: unknown): Response {
  return Response.json(body)
}

function renderOverlay() {
  const onClose = vi.fn()
  render(
    <>
      <div id={APP_ROOT_ID} />
      <SearchOverlay onClose={onClose} />
    </>,
  )
  return { onClose, input: screen.getByRole('textbox', { name: 'Search artists, exhibitions, news' }) }
}

async function type(input: HTMLElement, value: string): Promise<void> {
  fireEvent.change(input, { target: { value } })
}

async function flush(ms = DEBOUNCE_MS): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

describe('SearchOverlay', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('focuses the input on open', () => {
    const { input } = renderOverlay()
    expect(document.activeElement).toBe(input)
  })

  it('debounces typing by 200 ms and queries /api/search once with the latest value', async () => {
    fetchMock.mockResolvedValue(json({ groups: GROUPS }))
    const { input } = renderOverlay()

    await type(input, 'pi')
    await flush(DEBOUNCE_MS - 50)
    await type(input, 'pich')
    await flush(DEBOUNCE_MS - 1)
    expect(fetchMock).not.toHaveBeenCalled()
    await flush(1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('/api/search?q=pich')
  })

  it('renders each group with its eyebrow label and result links', async () => {
    fetchMock.mockResolvedValue(json({ groups: GROUPS }))
    const { input } = renderOverlay()

    await type(input, 'pich')
    await flush()

    expect(screen.getByText('Artists')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Vijay Pichumani' }).getAttribute('href')).toBe('/artists/vijay-pichumani')
    expect(screen.getByRole('link', { name: 'A show' }).getAttribute('href')).toBe('/news')
  })

  it('shows the prototype empty state when nothing matches', async () => {
    fetchMock.mockResolvedValue(json({ groups: [] }))
    const { input } = renderOverlay()

    await type(input, 'zzz')
    await flush()

    expect(screen.getByText('Nothing found for “zzz”.')).toBeTruthy()
  })

  it('aborts the in-flight request when the query changes', async () => {
    const signals: AbortSignal[] = []
    fetchMock.mockImplementation((_url, init) => {
      if (init?.signal) signals.push(init.signal)
      return new Promise<Response>(() => undefined)
    })
    const { input } = renderOverlay()

    await type(input, 'pi')
    await flush()
    await type(input, 'pich')
    await flush()

    expect(signals).toHaveLength(2)
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })

  it('clears results without a request when the query is blanked', async () => {
    fetchMock.mockResolvedValue(json({ groups: GROUPS }))
    const { input } = renderOverlay()

    await type(input, 'pich')
    await flush()
    await type(input, '  ')
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText(/Nothing found/)).toBeNull()
  })

  it('closes on Escape', async () => {
    const { onClose } = renderOverlay()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
