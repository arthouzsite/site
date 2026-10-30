import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, http, server } from '../../test/msw'
import ExhibitionsListPage from './ExhibitionsListPage'
import { ID, makeExhibition, renderRoutes } from './testUtils'

function setup(initial = '/exhibitions') {
  const requests: URL[] = []
  const items = [
    makeExhibition(),
    makeExhibition({ id: ID.a2, title: 'Quiet Matter', slug: 'quiet-matter', city: 'Singapore', isPublished: false, status: 'PAST', statusLabel: 'Past' }),
  ]
  server.use(
    http.get(`${API_URL}/exhibitions`, ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get('limit') !== '200') requests.push(url)
      return HttpResponse.json({ ...envelope(items), meta: { total: 45, page: 1, limit: 20 } })
    }),
  )
  const result = renderRoutes(initial, [{ path: '/exhibitions', element: <ExhibitionsListPage /> }, { path: '/exhibitions/:id', element: <p>editor</p> }])
  return { requests, items, ...result }
}

describe('ExhibitionsListPage', () => {
  it('lists exhibitions with status, resolved dates and links to the editor', async () => {
    const { router } = setup()
    expect(await screen.findByRole('link', { name: 'Tidewater' })).toHaveAttribute('href', `/exhibitions/${ID.ex}`)
    expect(screen.getAllByText('October 3 – November 22, 2026')).toHaveLength(2)
    expect(screen.getByText('Now on view', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Published: Tidewater' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Published: Quiet Matter' })).not.toBeChecked()
    await userEvent.click(screen.getByRole('link', { name: 'Tidewater' }))
    expect(router.state.location.pathname).toBe(`/exhibitions/${ID.ex}`)
  })

  it('syncs status, city, published, search and paging to the URL and request', async () => {
    const { requests, router } = setup()
    await screen.findByRole('link', { name: 'Tidewater' })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Upcoming' }))
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('status')).toBe('upcoming'))
    await user.selectOptions(screen.getByLabelText('City'), 'Singapore')
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('city')).toBe('Singapore'))
    await user.selectOptions(screen.getByLabelText('Published'), 'Draft')
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('published')).toBe('false'))
    await user.type(screen.getByLabelText('Search'), 'tide')
    await waitFor(() => expect(router.state.location.search).toContain('q=tide'))
    await user.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() => expect(requests.at(-1)!.searchParams.get('page')).toBe('2'))
  })

  it('bulk publish sends selected ids', async () => {
    setup()
    let body: unknown = null
    server.use(
      http.patch(`${API_URL}/exhibitions/publish`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(envelope({ updated: 2 }))
      }),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('checkbox', { name: 'Select Tidewater' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Quiet Matter' }))
    const bar = screen.getByRole('region', { name: 'Bulk actions' })
    expect(within(bar).getByText('2 selected')).toBeInTheDocument()
    await user.click(within(bar).getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(body).toEqual({ ids: [ID.ex, ID.a2], isPublished: true }))
    expect(await screen.findByText('Published 2 exhibitions')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument())
  })

  it('unpublishes in bulk, clears the selection and toggles one row', async () => {
    setup()
    const bodies: unknown[] = []
    server.use(
      http.patch(`${API_URL}/exhibitions/publish`, async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json(envelope({})) }),
      http.patch(`${API_URL}/exhibitions/${ID.a2}/publish`, async ({ request }) => { bodies.push(await request.json()); return HttpResponse.json(envelope({})) }),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('checkbox', { name: 'Select Tidewater' }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select Tidewater' }))
    await user.click(screen.getByRole('button', { name: 'Unpublish' }))
    await waitFor(() => expect(bodies).toContainEqual({ ids: [ID.ex], isPublished: false }))
    await user.click(screen.getByRole('switch', { name: 'Published: Quiet Matter' }))
    await waitFor(() => expect(bodies).toContainEqual({ isPublished: true }))
  })

  it('shows an empty state when nothing matches', async () => {
    server.use(http.get(`${API_URL}/exhibitions`, () => HttpResponse.json({ ...envelope([]), meta: { total: 0, page: 1, limit: 20 } })))
    renderRoutes('/exhibitions?q=zzz', [{ path: '/exhibitions', element: <ExhibitionsListPage /> }])
    expect(await screen.findByText('No exhibitions match.')).toBeInTheDocument()
  })
})
