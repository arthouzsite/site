import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '../../lib/toast'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import MediaPage from './MediaPage'
import { makeMedia } from './testUtils'

function setup(initial = '/media') {
  const requests: URL[] = []
  const items = [makeMedia(), makeMedia({ id: 'm2', alt: '', key: 'media/noalt.jpg' })]
  server.use(
    http.get(`${API_URL}/media`, ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      return HttpResponse.json({ ...envelope(items), meta: { total: 40, page: 1, limit: 18 } })
    }),
    http.get(`${API_URL}/media/m1`, () => HttpResponse.json(envelope({ ...items[0]!, usedBy: [] }))),
  )
  const router = createMemoryRouter([{ path: '/media', element: <MediaPage /> }], { initialEntries: [initial] })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <ToastProvider><RouterProvider router={router} /></ToastProvider>
    </QueryClientProvider>,
  )
  return { requests, router }
}

describe('MediaPage', () => {
  it('lists media, flags missing alt and opens the detail panel', async () => {
    setup()
    expect(await screen.findByText('No alt text')).toBeInTheDocument()
    expect(screen.getByText('40 files')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('option', { name: /m1\.jpg/i }))
    expect(await screen.findByDisplayValue('Tidewater hero')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Close details' }))
    expect(screen.queryByDisplayValue('Tidewater hero')).not.toBeInTheDocument()
  })

  it('syncs the missing-alt toggle, debounced search and paging to the URL and request', async () => {
    const { requests, router } = setup()
    await screen.findByText('No alt text')
    const user = userEvent.setup()
    await user.click(screen.getByRole('switch', { name: 'Missing alt text' }))
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('missingAlt')).toBe('true'))
    await user.type(screen.getByLabelText('Search by file name or alt text'), 'tide')
    await waitFor(() => expect(router.state.location.search).toContain('q=tide'))
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('q')).toBe('tide'))
    await user.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('page')).toBe('2'))
  })

  it('moves focus between tiles with arrow keys and selects with Enter', async () => {
    setup('/media?q=&page=1')
    const first = await screen.findByRole('option', { name: /m1\.jpg/i })
    first.focus()
    const user = userEvent.setup()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: /noalt\.jpg/i })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('option', { name: /noalt\.jpg/i })).toHaveAttribute('aria-selected', 'true')
  })
})
