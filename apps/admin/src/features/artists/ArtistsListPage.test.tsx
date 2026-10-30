import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { API_URL, HttpResponse, envelope, errorEnvelope, http, server } from '../../test/msw'
import ArtistsListPage from './ArtistsListPage'
import { makeArtist, renderRoutes } from './testUtils'

const alpha = makeArtist({ id: 'a1', name: 'Alpha Artist', isFeatured: true, featuredOrder: 1 })
const beta = makeArtist({ id: 'a2', name: 'Beta Artist', sortName: 'Beta Artist', indexLetter: 'B', isFeatured: true, featuredOrder: 2 })
const gamma = makeArtist({ id: 'a3', name: 'Gamma Artist', sortName: 'Gamma Artist', indexLetter: 'G', isFeatured: false, isPublished: false })

function setup(initial = '/artists') {
  const listRequests: URL[] = []
  const calls: { method: string; path: string; body: unknown }[] = []
  server.use(
    http.get(`${API_URL}/artists`, ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get('featured') === 'true' && url.searchParams.get('limit') === '100') {
        return HttpResponse.json({ ...envelope([beta, alpha]), meta: { total: 2, page: 1, limit: 100 } })
      }
      listRequests.push(url)
      return HttpResponse.json({ ...envelope([alpha, beta, gamma]), meta: { total: 3, page: 1, limit: 20 } })
    }),
    http.put(`${API_URL}/artists/featured-order`, async ({ request }) => {
      calls.push({ method: 'PUT', path: '/artists/featured-order', body: await request.json() })
      return HttpResponse.json(envelope([beta, alpha]))
    }),
    http.patch(`${API_URL}/artists/:id/feature`, async ({ request, params }) => {
      calls.push({ method: 'PATCH', path: `/artists/${String(params.id)}/feature`, body: await request.json() })
      return HttpResponse.json(envelope(gamma))
    }),
  )
  const view = renderRoutes([{ path: '/artists', element: <ArtistsListPage /> }], initial)
  return { listRequests, calls, ...view }
}

describe('ArtistsListPage', () => {
  it('lists artists with works, featured position and published state', async () => {
    setup()
    const table = await screen.findByRole('table', { name: 'Artists' })
    expect(await within(table).findByRole('link', { name: 'Alpha Artist' })).toHaveAttribute('href', '/artists/a1')
    expect(within(table).getByRole('switch', { name: 'Published: Gamma Artist' })).not.toBeChecked()
    expect(await within(table).findByText('1 of 2')).toBeInTheDocument()
  })

  it('letter strip sets ?letter=', async () => {
    const { router, listRequests } = setup()
    await screen.findByRole('table', { name: 'Artists' })
    await userEvent.click(screen.getByRole('button', { name: 'K' }))
    expect(router.state.location.search).toContain('letter=K')
    await waitFor(() => expect(listRequests.at(-1)!.searchParams.get('letter')).toBe('K'))
    expect(screen.getByRole('button', { name: 'K' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'K' }))
    expect(router.state.location.search).not.toContain('letter')
  })

  it('featured order move persists', async () => {
    const { calls } = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Move Alpha Artist down' }))
    await waitFor(() => expect(calls).toHaveLength(1))
    expect(calls[0]).toEqual({ method: 'PUT', path: '/artists/featured-order', body: { ids: ['a2', 'a1'] } })
  })

  it('the featured switch calls the feature endpoint', async () => {
    const { calls } = setup()
    await userEvent.click(await screen.findByRole('switch', { name: 'Featured: Gamma Artist' }))
    await waitFor(() => expect(calls).toContainEqual({ method: 'PATCH', path: '/artists/a3/feature', body: { isFeatured: true } }))
  })

  it('syncs the featured and published filters to the URL', async () => {
    const { router, listRequests } = setup()
    await screen.findByRole('table', { name: 'Artists' })
    await userEvent.selectOptions(screen.getByLabelText('Featured'), 'false')
    await userEvent.selectOptions(screen.getByLabelText('Published'), 'true')
    await waitFor(() => expect(listRequests.at(-1)!.searchParams.get('published')).toBe('true'))
    expect(router.state.location.search).toContain('featured=false')
  })

  it('delete artist 409 shows the exhibitions that block it', async () => {
    setup()
    server.use(
      http.delete(`${API_URL}/artists/a1`, () =>
        HttpResponse.json(
          { ...errorEnvelope('ARTIST_IN_USE', 'Artist is used by exhibitions or has artworks'), error: {
            code: 'ARTIST_IN_USE',
            message: 'in use',
            details: { exhibitions: [{ id: 'e1', title: 'Naan Yaar' }], workCount: 3, artworkCount: 2 },
          } },
          { status: 409 },
        ),
      ),
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Delete Alpha Artist' }))
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: /can.t be deleted/i })
    expect(within(dialog).getByText('Naan Yaar')).toBeInTheDocument()
    expect(within(dialog).getByText(/2 works/i)).toBeInTheDocument()
  })
})
